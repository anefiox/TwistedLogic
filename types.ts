
export enum GameState {
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface StoryMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 image or URL
  audio?: string; // Base64 audio
}

export interface GameContext {
  history: StoryMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface LLMSettings {
  provider: 'gemini' | 'external';
  baseUrl: string;
  modelName: string;
  apiKey: string;
  autoGenerateImage: boolean;
  autoGenerateAudio: boolean;
}

export interface GameResponse {
  text: string;
  ended: boolean;
}

export const DEFAULT_SETTINGS: LLMSettings = {
  provider: 'gemini',
  baseUrl: 'http://localhost:1234/v1',
  modelName: 'gemini-2.5-flash',
  apiKey: '',
  autoGenerateImage: true,
  autoGenerateAudio: true
};
