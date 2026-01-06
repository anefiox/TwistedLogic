
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    // Clear error when user makes changes
    if (errorMsg) setErrorMsg(null);
  };

  const handleProviderSwitch = (newProvider: 'gemini' | 'external') => {
    const updates: Partial<LLMSettings> = { provider: newProvider };
    
    // Reset model name to appropriate defaults when switching
    if (newProvider === 'gemini') {
        updates.modelName = 'gemini-2.5-flash';
    } else if (newProvider === 'external') {
        // If switching to external and current model is a specific gemini one, clear it or set a generic default
        if (settings.modelName.startsWith('gemini')) {
            updates.modelName = ''; 
        }
    }
    
    onSettingsChange({
        ...settings,
        ...updates
    });
    
    if (errorMsg) setErrorMsg(null);
  };

  const validateAndSave = () => {
    if (settings.provider === 'gemini' && !settings.apiKey.trim()) {
      setErrorMsg("API Key required for Gemini access.");
      return;
    }
    // External/Local allows empty key
    setShowConfig(false);
    setErrorMsg(null);
  };

  const handleStartAttempt = () => {
    if (settings.provider === 'gemini' && !settings.apiKey.trim()) {
      setErrorMsg("Please configure a Gemini API Key to proceed.");
      setShowConfig(true);
      return;
    }
    onStart();
  };

  if (showConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-black/95 p-8 text-left font-mono z-50 overflow-y-auto">
        <div className="w-full max-w-lg border-2 border-white/20 p-6 bg-gray-900 rounded-lg shadow-2xl">
          <h2 className="text-xl text-white mb-6 uppercase tracking-widest border-b border-white/10 pb-3">Settings</h2>
          
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-900/40 border border-red-500/50 text-red-200 text-xs font-bold uppercase tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
               <span className="text-red-500 text-lg">!</span> {errorMsg}
            </div>
          )}
          
          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <label className="text-xs uppercase text-gray-500 tracking-tighter">Reality Provider</label>
              <div className="flex space-x-2 bg-black/40 p-1 rounded border border-white/5">
                <button 
                  onClick={() => handleProviderSwitch('gemini')}
                  className={`flex-1 py-2 text-[10px] tracking-widest transition-all ${settings.provider === 'gemini' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  GOOGLE GEMINI
                </button>
                <button 
                   onClick={() => handleProviderSwitch('external')}
                   className={`flex-1 py-2 text-[10px] tracking-widest transition-all ${settings.provider === 'external' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  EXTERNAL LLM
                </button>
              </div>
            </div>

            {settings.provider === 'external' ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-white/5 pt-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] uppercase text-gray-500">Base URL</label>
                  <input 
                    type="text" 
                    value={settings.baseUrl}
                    onChange={(e) => handleChange('baseUrl', e.target.value)}
                    className="bg-black border border-white/10 text-white p-2 text-sm focus:border-white/40 focus:outline-none rounded transition-colors"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] uppercase text-gray-500">Model Name</label>
                  <input 
                    type="text" 
                    value={settings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    className="bg-black border border-white/10 text-white p-2 text-sm focus:border-white/40 focus:outline-none rounded transition-colors"
                    placeholder="e.g. mistralai/ministral-3-3b"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] uppercase text-gray-500">API Key (Local/Other)</label>
                  <input 
                    type="password" 
                    value={settings.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    className="bg-black border border-white/10 text-white p-2 text-sm focus:border-white/40 focus:outline-none rounded transition-colors"
                    placeholder="Enter key for external provider..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-white/5 pt-4">
                <div className="flex flex-col space-y-3">
                  <label className="text-[10px] uppercase text-gray-500">Google AI Authorization</label>
                  
                  <div className="flex flex-col space-y-1">
                    <input 
                      type="password" 
                      value={settings.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      className="bg-black border border-white/10 text-white p-3 text-sm focus:border-white/60 focus:outline-none rounded transition-colors font-mono tracking-wider"
                      placeholder="Paste your API Key here..."
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                      <label className="text-[10px] uppercase text-gray-500">Gemini Model</label>
                      <select 
                        value={settings.modelName} 
                        onChange={(e) => handleChange('modelName', e.target.value)}
                        className="bg-black border border-white/10 text-white p-2 text-sm focus:border-white/40 focus:outline-none rounded transition-colors"
                      >
                          <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                          <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Fast)</option>
                          <option value="gemini-3-pro-preview">Gemini 3 Pro Preview (High Quality)</option>
                      </select>
                  </div>

                  <div className="bg-white/5 p-4 border border-white/10 rounded space-y-2">
                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
                      How to play for free:
                    </p>
                    <ol className="list-decimal list-inside text-[10px] text-gray-400 space-y-1 leading-relaxed">
                      <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">Google AI Studio</a>.</li>
                      <li>Click <span className="text-white">"Create API Key"</span>.</li>
                      <li>Select the "Free" tier (Gemini 2.5 Flash).</li>
                      <li>Paste the key above.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-white/10 space-y-4">
              <label className="text-[10px] uppercase text-gray-500 block">Sub-System Toggles</label>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                   onClick={() => handleChange('autoGenerateImage', !settings.autoGenerateImage)}
                   className={`py-2 border text-[9px] tracking-widest font-bold transition-all ${settings.autoGenerateImage ? 'bg-white/10 text-white border-white/40' : 'bg-black text-gray-600 border-white/5'}`}
                >
                  VISUALS: {settings.autoGenerateImage ? 'ON' : 'OFF'}
                </button>
                <button 
                   onClick={() => handleChange('autoGenerateAudio', !settings.autoGenerateAudio)}
                   className={`py-2 border text-[9px] tracking-widest font-bold transition-all ${settings.autoGenerateAudio ? 'bg-white/10 text-white border-white/40' : 'bg-black text-gray-600 border-white/5'}`}
                >
                  AUDIO: {settings.autoGenerateAudio ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={validateAndSave}
            className="mt-10 w-full bg-white text-black py-3 hover:bg-gray-200 transition-colors uppercase text-xs font-bold tracking-[0.3em] rounded"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black text-center select-none cursor-pointer relative" onClick={handleStartAttempt}>
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none overflow-hidden">
         <svg className="animate-[spin_12s_linear_infinite] w-[200%] h-[200%] sm:w-full sm:h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50,50 m0,-45 a45,45 0 1,1 0,90 a45,45 0 1,1 0,-90" fill="none" stroke="white" strokeWidth="0.2" strokeDasharray="10,20" />
            <path d="M50,50 m0,-35 a35,35 0 1,0 0,70 a35,35 0 1,0 0,-70" fill="none" stroke="white" strokeWidth="0.3" strokeDasharray="5,15" className="animate-[spin_10s_linear_infinite_reverse] origin-center" />
            <path d="M50,50 m0,-20 a20,20 0 1,1 0,40 a20,20 0 1,1 0,-40" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2,2" className="animate-[spin_20s_linear_infinite] origin-center" />
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
          onClick={(e) => { e.stopPropagation(); handleStartAttempt(); }}
          className={`mt-12 px-8 py-3 border border-white hover:bg-white hover:text-black transition-all duration-300 font-bold uppercase tracking-widest ${textStage >= 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          Begin The Journey
        </button>
      </div>

      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-1000 ${textStage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowConfig(true); setErrorMsg(null); }}
          className="text-gray-700 hover:text-white text-[10px] uppercase tracking-[0.5em] font-bold border-b border-transparent hover:border-white/20 transition-all pb-1"
        >
          Settings
        </button>
      </div>
    </div>
  );
};

export default IntroScreen;
