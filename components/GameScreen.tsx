
import React, { useState, useEffect, useRef } from 'react';
import { startNewEpisode, continueStory, generateSceneImage, generateNarrationAudio, playAudioFromBase64, playBrowserAudio } from '../services/geminiService';
import { StoryMessage, LLMSettings } from '../types';

interface GameScreenProps {
  onRestart: () => void;
  settings: LLMSettings;
}

const GameScreen: React.FC<GameScreenProps> = ({ onRestart, settings }) => {
  const [history, setHistory] = useState<StoryMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    // Stop Web Audio API (Google TTS)
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) {
        // Ignore errors
      }
      audioSourceRef.current = null;
    }
    // Stop Browser TTS
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const playManagedAudio = async (audioData: string) => {
    stopAudio(); // Ensure any previous audio is killed
    
    setIsPlayingAudio(true);
    const source = await playAudioFromBase64(audioData);
    
    if (source) {
      audioSourceRef.current = source;
      source.onended = () => {
        setIsPlayingAudio(false);
        audioSourceRef.current = null;
      };
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleAudioPlayback = (text: string, audioData?: string) => {
      stopAudio();
      setIsPlayingAudio(true);
      
      if (audioData) {
          // Play High Quality Google Audio
          playManagedAudio(audioData);
      } else {
          // Play Browser Fallback
          playBrowserAudio(text);
          // Auto-turn off indicator after a rough estimate (100ms per char) or max 10s
          setTimeout(() => setIsPlayingAudio(false), Math.min(text.length * 100, 10000));
      }
  };

  const updateLastMessageAsset = (type: 'image' | 'audio', data: string) => {
     setHistory(prev => {
         const newHistory = [...prev];
         const lastIndex = newHistory.length - 1;
         if (newHistory[lastIndex] && newHistory[lastIndex].role === 'model') {
             newHistory[lastIndex] = { ...newHistory[lastIndex], [type]: data };
         }
         return newHistory;
     });
  };

  const handleGenerateAssets = (text: string) => {
      if (settings.autoGenerateImage) {
        setIsImageLoading(true);
        generateSceneImage(text, settings.apiKey).then(img => {
            setIsImageLoading(false);
            if (img) updateLastMessageAsset('image', img);
        });
      }

      if (settings.autoGenerateAudio) {
        generateNarrationAudio(text, settings.apiKey).then(audio => {
          if (audio) {
              updateLastMessageAsset('audio', audio);
              if (autoNarrate) handleAudioPlayback(text, audio);
          } else if (autoNarrate) {
              // Fallback to browser audio if no key/quota
              handleAudioPlayback(text);
          }
        });
      }
  };

  // Initial Load
  useEffect(() => {
    const initGame = async () => {
      stopAudio();
      setIsLoading(true);
      
      const { text, ended } = await startNewEpisode(settings);
      
      const newMessage: StoryMessage = { role: 'model', text: text };
      
      setHistory([newMessage]);
      if (ended) setIsEnded(true);

      handleGenerateAssets(text);

      setIsLoading(false);
    };

    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isLoading, isImageLoading, isEnded]);

  const handleAction = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isLoading || isEnded) return;

    stopAudio();

    const action = userInput;
    setUserInput('');
    setIsLoading(true);

    const userMsg: StoryMessage = { role: 'user', text: action };
    setHistory(prev => [...prev, userMsg]);

    const { text, ended } = await continueStory(history, action, settings);
    
    const aiMsg: StoryMessage = { role: 'model', text: text };
    setHistory(prev => [...prev, aiMsg]);

    if (ended) {
      setIsEnded(true);
    } else {
      handleGenerateAssets(text);
    }

    setIsLoading(false);
  };

  const handlePlayClick = async (msg: StoryMessage) => {
      stopAudio();
      
      if (msg.audio) {
          handleAudioPlayback(msg.text, msg.audio);
      } else {
          // Try to generate on demand
          setIsPlayingAudio(true);
          const audioData = await generateNarrationAudio(msg.text, settings.apiKey);
          
          if (audioData) {
              updateLastMessageAsset('audio', audioData);
              handleAudioPlayback(msg.text, audioData);
          } else {
             // Fallback
             handleAudioPlayback(msg.text);
          }
      }
  };

  const handleAbort = () => {
    stopAudio();
    setIsEnded(true);
  };

  return (
    <div className="flex flex-col h-full bg-black/90 relative">
      
      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 pb-20">
        {history.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
             
             {/* Text Bubble */}
             <div className={`max-w-[90%] sm:max-w-[80%] rounded-lg p-4 font-serif leading-relaxed ${
               msg.role === 'user' 
                 ? 'bg-gray-900 border border-gray-700 text-gray-300' 
                 : 'bg-transparent text-gray-100 border-l-4 border-white pl-6'
             }`}>
                {msg.role === 'model' && (
                    <div className="mb-2 text-xs uppercase tracking-widest opacity-50 font-sans flex justify-between items-center">
                        <span>The Curator</span>
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => handlePlayClick(msg)}
                                className={`hover:text-white transition-colors disabled:opacity-30 ${msg.audio || isPlayingAudio ? 'text-white' : 'text-gray-500'} ${isPlayingAudio ? 'animate-pulse' : ''}`}
                                title="Narrate"
                                disabled={isLoading}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill={msg.audio ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
             </div>

             {/* Image Attachment */}
             {msg.image ? (
                 <div className="mt-4 w-full max-w-md border-4 border-white/10 shadow-lg rounded overflow-hidden opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
                     <img src={msg.image} alt="Scene" className="w-full h-auto grayscale contrast-125 brightness-90 sepia-[.2]" />
                 </div>
             ) : (isImageLoading && idx === history.length - 1 && msg.role === 'model') && (
                 <div className="mt-4 w-full max-w-md h-64 bg-gray-900 border-4 border-white/10 flex items-center justify-center animate-pulse">
                     <div className="text-xs uppercase tracking-widest text-gray-600 font-mono">
                         Scanning Visual Feed...
                     </div>
                 </div>
             )}
          </div>
        ))}

        {isEnded && (
          <div className="flex flex-col items-center justify-center py-12 px-6 border-y border-white/10 bg-white/5 space-y-6 animate-in fade-in zoom-in-95 duration-700">
             <div className="text-center space-y-4 max-w-md">
                <p className="text-gray-400 font-serif text-lg leading-relaxed italic">
                  "Twisted Logic is free and always will be. 
                  If you enjoyed this story, you can optionally support the project on Ko-fi."
                </p>
                <div id="kofi-button-container" className="flex justify-center mt-4">
                  <a 
                    href='https://ko-fi.com/L3L21RQ7SK' 
                    target='_blank' 
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-[#72a4f2] text-white font-bold py-2 px-6 rounded-full hover:brightness-110 transition-all shadow-lg text-sm"
                  >
                     <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi cup" className="h-4 w-auto animate-pulse" />
                     <span>Support me on Ko-fi</span>
                  </a>
                </div>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full justify-center">
                 <button 
                    onClick={onRestart}
                    className="px-10 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                 >
                    Start New Episode
                 </button>
             </div>
          </div>
        )}

        {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500 italic p-4">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-xs tracking-widest uppercase ml-2">Transmitting...</span>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4 bg-black">
        {!isEnded ? (
          <>
            <form onSubmit={handleAction} className="flex gap-2">
                <input 
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="What do you do?"
                    className="flex-1 bg-gray-900 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-white transition-colors font-mono"
                    autoFocus
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !userInput.trim()}
                    className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Act
                </button>
            </form>
            <div className="mt-2 flex justify-between items-center text-xs text-gray-600 font-mono">
                <div className="flex gap-4">
                    <span>Episode in progress...</span>
                    {settings.autoGenerateAudio && (
                      <label className="flex items-center cursor-pointer hover:text-gray-400">
                          <input 
                              type="checkbox" 
                              checked={autoNarrate} 
                              onChange={(e) => setAutoNarrate(e.target.checked)} 
                              className="mr-2 accent-white"
                          />
                          Auto-Play Audio
                      </label>
                    )}
                </div>
                <button onClick={handleAbort} className="hover:text-red-500 transition-colors uppercase tracking-tighter">Terminate Transmission</button>
            </div>
          </>
        ) : (
          <div className="text-center text-xs text-gray-600 uppercase tracking-widest font-mono py-2">
            The signal has been lost. Episode concluded.
          </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;
