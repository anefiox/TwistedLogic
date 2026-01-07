
import { StoryMessage, GameResponse } from '../types';

const POLLINATIONS_TEXT_URL = 'https://text.pollinations.ai/';
const DEEPAI_TEXT_URL = 'https://api.deepai.org/api/text-generator';
const DEEPAI_KEY = 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K'; // Public demo key

// Helper to check for end game condition in plain text responses
const checkEnded = (text: string): boolean => {
  const lower = text.toLowerCase();
  return lower.includes('[the_end]') || lower.includes('the end.') || lower.includes('game over');
};

const cleanResponse = (text: string): string => {
    return text.replace(/\[THE_END\]/g, '').replace(/\[JSON\]/g, '').trim();
};

// 1. Pollinations.ai (Supports Chat Format)
async function tryPollinationsText(systemInstruction: string, history: StoryMessage[], lastUserText: string): Promise<GameResponse | undefined> {
  try {
    const messages = [
        { role: 'system', content: systemInstruction + "\n\nIMPORTANT: Respond with the story narrative ONLY. Do not output JSON. If the story ends, append [THE_END] to the end of the text." },
        ...history.map(msg => ({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text })),
        { role: 'user', content: lastUserText }
    ];

    const response = await fetch(POLLINATIONS_TEXT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        model: 'openai', // Pollinations uses this to route to their best available free model
        seed: Math.floor(Math.random() * 1000)
      })
    });

    if (!response.ok) throw new Error('Pollinations Text Failed');
    
    // Pollinations usually returns raw text in the body
    const text = await response.text();
    if (!text) throw new Error('Empty response');

    return {
        text: cleanResponse(text),
        ended: checkEnded(text)
    };
  } catch (e) {
    console.warn("Pollinations Text Error:", e);
    return undefined;
  }
}

// 2. DeepAI (Completion Format)
async function tryDeepAIText(systemInstruction: string, history: StoryMessage[], lastUserText: string): Promise<GameResponse | undefined> {
  try {
    // Construct a flat prompt
    let prompt = `${systemInstruction}\n\n`;
    history.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Player' : 'Curator'}: ${msg.text}\n`;
    });
    prompt += `Player: ${lastUserText}\nCurator:`;

    const formData = new FormData();
    formData.append('text', prompt);

    const response = await fetch(DEEPAI_TEXT_URL, {
      method: 'POST',
      headers: { 'api-key': DEEPAI_KEY },
      body: formData
    });

    if (!response.ok) throw new Error('DeepAI Text Failed');

    const data = await response.json();
    let text = data.output || "";
    
    // DeepAI sometimes returns the whole prompt + continuation. We need to strip the prompt if it does.
    // However, text-generator usually just returns continuation.
    
    return {
        text: cleanResponse(text),
        ended: checkEnded(text)
    };

  } catch (e) {
    console.warn("DeepAI Text Error:", e);
    return undefined;
  }
}

export const generateFreeText = async (
    history: StoryMessage[], 
    lastUserText: string,
    systemInstruction: string
): Promise<GameResponse> => {
    
    // 1. Try Pollinations (Better quality, follows instructions better)
    const pollResult = await tryPollinationsText(systemInstruction, history, lastUserText);
    if (pollResult) return pollResult;

    // 2. Try DeepAI
    const deepResult = await tryDeepAIText(systemInstruction, history, lastUserText);
    if (deepResult) return deepResult;

    // 3. Fallback
    return {
        text: "The signal is lost in the static... (All free text generation services failed. Please try again or add an API Key).",
        ended: false
    };
};
