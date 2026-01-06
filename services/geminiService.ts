import { GoogleGenAI, Modality, Type } from "@google/genai";
import { StoryMessage, LLMSettings } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for Models
const TEXT_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const AUDIO_MODEL = 'gemini-2.5-flash-preview-tts';

const SYSTEM_INSTRUCTION = `
You are "The Curator", the mysterious and cynical host of "Twisted Logic".
Your goal is to guide the user through a surreal, interactive tale of suspense, irony, and the supernatural.
The genre is a mix of sci-fi, horror, and psychological thriller, evoking the feel of classic 1960s anthology TV shows.

Rules:
1. Speak in a sophisticated, clipped, and intellectual style. You are an observer of human folly.
2. Start the game with an atmospheric opening monologue setting the scene for a NEW, random, strange scenario involving the player.
3. The story should be interactive. At the end of each narration, present the situation clearly and wait for the user's action.
4. Keep your responses concise (max 150 words) to keep the pace moving, but descriptive enough to be atmospheric.
5. If the user does something foolish, narrate the consequences, potentially leading to a "twist ending" or game over where logic completely unravels.
6. Maintain a black-and-white, noir atmosphere in your descriptions.
7. CRITICAL: When the story reaches a definitive conclusion (whether death, madness, or resolution), you MUST append the tag [THE_END] to the very end of your response. Do not use this tag unless the story is absolutely finished.
`;

// Helper for External OpenAI-Compatible Calls
async function callExternalLLM(messages: any[], settings: LLMSettings): Promise<string> {
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
    return data.choices?.[0]?.message?.content || "The signal was received, but the message is blank.";
  } catch (error) {
    console.error("External LLM Error:", error);
    // Return the error message to the UI so the user sees what happened
    return `Transmission failure. The external frequency is jammed. (${error instanceof Error ? error.message : String(error)})`;
  }
}

export const startNewEpisode = async (settings: LLMSettings): Promise<string> => {
  // External Provider Path
  if (settings.provider === 'external') {
    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: "Begin the episode. Set the scene and introduce the protagonist (the player) into a world where logic is twisted." }
    ];
    return callExternalLLM(messages, settings);
  }

  // Gemini Path
  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: "Begin the episode. Set the scene and introduce the protagonist (the player) into a world where logic is twisted.",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 1024 } 
      }
    });
    return response.text || "The screen flickers... the signal is weak.";
  } catch (error) {
    console.error("Error starting episode:", error);
    return "The signal is lost... reality is buffering.";
  }
};

export const continueStory = async (history: StoryMessage[], userAction: string, settings: LLMSettings): Promise<string> => {
  // External Provider Path
  if (settings.provider === 'external') {
    const messages: any[] = [
      { role: "system", content: SYSTEM_INSTRUCTION }
    ];
    
    // Inject the initial prompt if the history starts with the model
    // This ensures the conversation structure is System -> User -> Assistant -> User...
    // which prevents errors with strict LLM API validators (like LM Studio or Mistral)
    if (history.length > 0 && history[0].role === 'model') {
        messages.push({
            role: "user",
            content: "Begin the episode. Set the scene and introduce the protagonist (the player) into a world where logic is twisted."
        });
    }

    // Convert history to OpenAI format
    history.forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text || "..."
      });
    });

    messages.push({ role: "user", content: userAction });
    
    return callExternalLLM(messages, settings);
  }

  // Gemini Path
  try {
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: userAction }]
    });

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Static fills the air...";
  } catch (error) {
    console.error("Error continuing story:", error);
    return "A connection error in the void...";
  }
};

// Image and Audio always use Gemini regardless of text provider
export const generateSceneImage = async (sceneDescription: string): Promise<string | undefined> => {
  try {
    const prompt = `A high contrast, black and white, film noir style scene depicting: ${sceneDescription}. Grainy 1960s television quality. eerie atmosphere, surreal, mysterious. no text in the image`;
    
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
      config: {}
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Error generating image:", error);
    return undefined;
  }
};

export const generateNarrationAudio = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: AUDIO_MODEL,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        return base64Audio;
    }
    return undefined;
  } catch (error) {
    console.error("Error generating audio:", error);
    return undefined;
  }
};

// Helper: Decode Base64 to Uint8Array
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Decode raw PCM data (16-bit) to AudioBuffer
async function decodePCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
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