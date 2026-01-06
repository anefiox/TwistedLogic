import React, { useEffect, useState } from 'react';
import { LLMSettings } from '../types';

interface IntroScreenProps {
  onStart: () => void;
  settings: LLMSettings;
  onSettingsChange: (settings: LLMSettings) => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart, settings, onSettingsChange }) => {
  const [textStage, setTextStage] = useState(0);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setTextStage(1), 1000),
      setTimeout(() => setTextStage(2), 3500),
      setTimeout(() => setTextStage(3), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleChange = (field: keyof LLMSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  if (showConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-black/90 p-8 text-left font-mono z-50 overflow-y-auto">
        <div className="w-full max-w-lg border-2 border-white/20 p-6 bg-gray-900/90 rounded shadow-2xl">
          <h2 className="text-xl text-white mb-6 uppercase tracking-widest border-b border-white/20 pb-2">System Configuration</h2>
          
          <div className="space-y-6">
            {/* Provider Section */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs uppercase text-gray-400">Text Provider</label>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleChange('provider', 'gemini')}
                  className={`flex-1 py-2 border text-xs tracking-tighter ${settings.provider === 'gemini' ? 'bg-white text-black border-white' : 'border-gray-600 text-gray-500 hover:border-gray-400'}`}
                >
                  GEMINI (PRO)
                </button>
                <button 
                   onClick={() => handleChange('provider', 'external')}
                   className={`flex-1 py-2 border text-xs tracking-tighter ${settings.provider === 'external' ? 'bg-white text-black border-white' : 'border-gray-600 text-gray-500 hover:border-gray-400'}`}
                >
                  EXTERNAL (LM STUDIO)
                </button>
              </div>
            </div>

            {settings.provider === 'external' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs uppercase text-gray-400">Base URL</label>
                  <input 
                    type="text" 
                    value={settings.baseUrl}
                    onChange={(e) => handleChange('baseUrl', e.target.value)}
                    className="bg-black border border-gray-600 text-white p-2 text-sm focus:border-white focus:outline-none"
                    placeholder="http://localhost:1234/v1"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-xs uppercase text-gray-400">Model Name</label>
                  <input 
                    type="text" 
                    value={settings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    className="bg-black border border-gray-600 text-white p-2 text-sm focus:border-white focus:outline-none"
                    placeholder="mistralai/ministral-3-3b"
                  />
                </div>
              </div>
            )}

            {/* Resource Management Section */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              <label className="text-xs uppercase text-gray-400 block mb-2">Gemini Credit Management</label>
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm text-white uppercase tracking-tight">Auto-Images</div>
                  <div className="text-[10px] text-gray-500 leading-tight">Visualizes every scene using Gemini. Disable to save credits.</div>
                </div>
                <button 
                   onClick={() => handleChange('autoGenerateImage', !settings.autoGenerateImage)}
                   className={`w-16 py-1 border text-[10px] ${settings.autoGenerateImage ? 'bg-green-900/20 text-green-400 border-green-500' : 'bg-red-900/20 text-red-400 border-red-500'}`}
                >
                  {settings.autoGenerateImage ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm text-white uppercase tracking-tight">Auto-Narration</div>
                  <div className="text-[10px] text-gray-500 leading-tight">Converts text to speech automatically. Disable to save credits.</div>
                </div>
                <button 
                   onClick={() => handleChange('autoGenerateAudio', !settings.autoGenerateAudio)}
                   className={`w-16 py-1 border text-[10px] ${settings.autoGenerateAudio ? 'bg-green-900/20 text-green-400 border-green-500' : 'bg-red-900/20 text-red-400 border-red-500'}`}
                >
                  {settings.autoGenerateAudio ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowConfig(false)}
            className="mt-8 w-full border border-white/50 text-white py-2 hover:bg-white hover:text-black transition-colors uppercase text-sm"
          >
            Save & Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black text-center select-none cursor-pointer relative" onClick={onStart}>
      {/* Spiral Animation SVG */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
         <svg className="animate-[spin_10s_linear_infinite] w-[150%] h-[150%] sm:w-full sm:h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50,50 m0,-45 a45,45 0 1,1 0,90 a45,45 0 1,1 0,-90" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="5,5" />
            <path d="M50,50 m0,-35 a35,35 0 1,0 0,70 a35,35 0 1,0 0,-70" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" className="animate-[spin_8s_linear_infinite_reverse] origin-center" />
            <path d="M50,50 m0,-25 a25,25 0 1,1 0,50 a25,25 0 1,1 0,-50" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="3,3" className="animate-[spin_15s_linear_infinite] origin-center" />
            <path d="M50,50 m0,-15 a15,15 0 1,0 0,30 a15,15 0 1,0 0,-30" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2,2" className="animate-[spin_5s_linear_infinite_reverse] origin-center" />
         </svg>
      </div>

      <div className="z-10 relative max-w-2xl px-6">
        <h1 className={`font-oswald text-4xl sm:text-6xl uppercase tracking-widest mb-8 transition-opacity duration-1000 ${textStage >= 1 ? 'opacity-100' : 'opacity-0'}`}>
          Twisted Logic
        </h1>
        
        <div className="font-mono text-gray-400 space-y-4 text-sm sm:text-lg min-h-[100px]">
          <p className={`transition-opacity duration-1000 ${textStage >= 2 ? 'opacity-100' : 'opacity-0'}`}>
            Enter a realm where reason fails...
          </p>
          <p className={`transition-opacity duration-1000 ${textStage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
            And the impossible becomes the inevitable.
          </p>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          className={`mt-12 px-8 py-3 border border-white hover:bg-white hover:text-black transition-all duration-300 font-bold uppercase tracking-widest ${textStage >= 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          Enter
        </button>
      </div>

      {/* Config Button */}
      <div className={`absolute bottom-4 right-4 transition-opacity duration-1000 ${textStage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
          className="text-gray-600 hover:text-white text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <span>Config</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.439.875 1.039.986 1.683.182 1.055-.048 2.12-.615 3.012a2.98 2.98 0 0 1-2.43 1.29c-.755 0-1.458-.29-1.994-.793a.75.75 0 0 1-.168-.781 19.127 19.127 0 0 0-.253-1.042" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default IntroScreen;