
import { GoogleGenAI, Modality, Type, Schema } from "@google/genai";
import { StoryMessage, LLMSettings } from "../types";

// Helper to safely get env variable without crashing in browser
const getEnvApiKey = () => {
  try {
    // Check for standard process.env (Node/Webpack)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    // Check for Vite specific env
    // Cast import.meta to any to avoid TS error: Property 'env' does not exist on type 'ImportMeta'
    const meta = import.meta as any;
    if (typeof meta !== 'undefined' && meta.env && meta.env.VITE_API_KEY) {
      return meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore errors in strict environments
  }
  return undefined;
};

// Helper to get a fresh AI instance.
// Prioritizes the key passed as argument (from settings), fallback to safe env check.
const getAI = (apiKey?: string) => new GoogleGenAI({ apiKey: apiKey || getEnvApiKey() });

// Constants for Models
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const AUDIO_MODEL = 'gemini-2.5-flash-preview-tts';

// Validate and sanitize Gemini model name
const getGeminiModelName = (modelName: string): string => {
  if (!modelName) return 'gemini-2.5-flash';
  // If the model name looks like an external one (e.g. contains slashes like 'mistralai/...')
  // or doesn't start with typical Google prefixes, fallback to default.
  if (modelName.includes('/') || (!modelName.startsWith('gemini') && !modelName.startsWith('veo'))) {
    console.warn(`Invalid Gemini model name detected: "${modelName}". Falling back to gemini-2.5-flash.`);
    return 'gemini-2.5-flash';
  }
  return modelName;
};

const SYSTEM_INSTRUCTION = `
You are "The Curator", the mysterious and cynical host of "Twisted Logic".
Your goal is to guide the user through a surreal, interactive tale of suspense, irony, and the supernatural.
The genre is a mix of sci-fi, horror, and psychological thriller, evoking the feel of classic 1960s anthology TV shows.

Rules:
1. Speak in a sophisticated, clipped, and intellectual style. You are an observer of human folly.
2. Start the game with an atmospheric opening monologue setting the scene for a NEW, random, strange scenario involving the player.
3. The story is a TEXT ADVENTURE. At the end of each narration, clearly present the immediate situation and explicitly ask or wait for the user to type their action.
4. Keep your responses concise (max 150 words) to keep the pace moving, but descriptive enough to be atmospheric.
5. If the user does something foolish, narrate the consequences, potentially leading to a "twist ending" or game over where logic completely unravels.
6. Maintain a black-and-white, noir atmosphere in your descriptions.
`;

// Define the JSON schema for the model's response
const GAME_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The story narration and dialogue from The Curator.",
    },
    isGameOver: {
      type: Type.BOOLEAN,
      description: "True if the story has reached a definitive conclusion (death, madness, or resolution).",
    },
  },
  required: ["narrative", "isGameOver"],
};

export interface GameResponse {
  text: string;
  ended: boolean;
}

async function callExternalLLM(messages: any[], settings: LLMSettings): Promise<GameResponse> {
  try {
    const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey || 'lm-studio'}`
      },
      body: JSON.stringify({
        model: settings.modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 300,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`External API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "The signal was received, but the message is blank.";
    
    // Basic heuristic for external models since they don't share the strict JSON schema
    const ended = rawText.includes("[THE_END]") || rawText.toLowerCase().includes("the end");
    return { text: rawText, ended };

  } catch (error) {
    console.error("External LLM Error:", error);
    return { 
      text: `Transmission failure. The external frequency is jammed. (${error instanceof Error ? error.message : String(error)})`,
      ended: false 
    };
  }
}

const handleGeminiError = (error: any): GameResponse => {
    console.error("Gemini API Error:", error);
    let errorMsg = "The signal is lost... reality is buffering.";

    const eMsg = error.message || JSON.stringify(error);

    if (eMsg.includes("API_KEY_INVALID") || eMsg.includes("key not found")) {
        errorMsg = "Transmission denied. Please verify your API Key in the 'Settings' menu.";
    } else if (eMsg.includes("429") || eMsg.includes("quota") || eMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "Quota exceeded. Please select a different model (e.g., Gemini 2.5 Flash) in Settings, or wait a moment.";
    } else if (eMsg.includes("Candidate was blocked")) {
        errorMsg = "The narrative veered into forbidden territory. The censors have cut the feed. Try a different action.";
    } else if (eMsg.includes("404") || eMsg.includes("Not Found")) {
        errorMsg = "Model frequency not found. Check your model selection in Settings.";
    }

    return { text: errorMsg, ended: true };
};

export const startNewEpisode = async (settings: LLMSettings): Promise<GameResponse> => {
  if (settings.provider === 'external') {
    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: "Begin the episode. Set the scene and introduce the protagonist (the player) into a world where logic is twisted." }
    ];
    return callExternalLLM(messages, settings);
  }

  const ai = getAI(settings.apiKey);
  try {
    const modelToUse = getGeminiModelName(settings.modelName);
    
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: "Begin the episode. Set the scene and introduce the protagonist (the player) into a world where logic is twisted.",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: GAME_RESPONSE_SCHEMA,
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return { text: parsed.narrative, ended: parsed.isGameOver };
    }
    return { text: "The screen flickers... the signal is weak.", ended: false };

  } catch (error: any) {
    return handleGeminiError(error);
  }
};

export const continueStory = async (history: StoryMessage[], userAction: string, settings: LLMSettings): Promise<GameResponse> => {
  if (settings.provider === 'external') {
    const messages: any[] = [{ role: "system", content: SYSTEM_INSTRUCTION }];
    if (history.length > 0 && history[0].role === 'model') {
        messages.push({ role: "user", content: "Begin the episode. Set the scene and introduce the protagonist (the player) into a world where logic is twisted." });
    }
    history.forEach(msg => messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text || "..." }));
    messages.push({ role: "user", content: userAction });
    return callExternalLLM(messages, settings);
  }

  const ai = getAI(settings.apiKey);
  try {
    const modelToUse = getGeminiModelName(settings.modelName);

    const contents = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
    contents.push({ role: 'user', parts: [{ text: userAction }] });
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: GAME_RESPONSE_SCHEMA,
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return { text: parsed.narrative, ended: parsed.isGameOver };
    }
    return { text: "Static fills the air...", ended: false };

  } catch (error: any) {
    return handleGeminiError(error);
  }
};

export const generateSceneImage = async (sceneDescription: string, apiKey?: string): Promise<string | undefined> => {
  const ai = getAI(apiKey);
  try {
    const prompt = `A high contrast, black and white, film noir style scene depicting: ${sceneDescription}. Grainy 1960s television quality. eerie atmosphere, surreal, mysterious. no text in the image`;
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "4:3" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return undefined;
  } catch (error) {
    // Fail silently for assets to not interrupt gameplay
    console.error("Error generating image (likely quota):", error);
    return undefined;
  }
};

export const generateNarrationAudio = async (text: string, apiKey?: string): Promise<string | undefined> => {
  const ai = getAI(apiKey);
  try {
    const response = await ai.models.generateContent({
      model: AUDIO_MODEL,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    // Fail silently for assets
    console.error("Error generating audio (likely quota):", error);
    return undefined;
  }
};

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodePCM(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
}

export const playAudioFromBase64 = async (base64Audio: string) => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const pcmBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePCM(pcmBytes, audioContext, 24000);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        return source;
    } catch (e) {
        console.error("Audio playback error", e);
    }
};
