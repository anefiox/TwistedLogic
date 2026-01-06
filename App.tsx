import React, { useState, useEffect } from 'react';
import { GameState, LLMSettings, DEFAULT_SETTINGS } from './types';
import IntroScreen from './components/IntroScreen';
import GameScreen from './components/GameScreen';
import TVFrame from './components/TVFrame';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [settings, setSettings] = useState<LLMSettings>(() => {
    const saved = localStorage.getItem('twisted_logic_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const handleSettingsChange = (newSettings: LLMSettings) => {
    setSettings(newSettings);
    localStorage.setItem('twisted_logic_settings', JSON.stringify(newSettings));
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 pointer-events-none" />
      
      <TVFrame>
        {gameState === GameState.INTRO && (
          <IntroScreen 
            onStart={() => setGameState(GameState.PLAYING)} 
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        )}
        {gameState === GameState.PLAYING && (
          <GameScreen 
            onRestart={() => setGameState(GameState.INTRO)} 
            settings={settings}
          />
        )}
      </TVFrame>
    </div>
  );
};

export default App;