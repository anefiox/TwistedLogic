
const DEEPAI_API = 'https://api.deepai.org/api/text2img';
const DEEPAI_KEY = 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K'; // Public demo key

async function tryDeepAI(prompt: string): Promise<string | undefined> {
  try {
    const form = new FormData();
    // Enhance prompt for the game's style
    form.append('text', `(black and white film noir), ${prompt}, grainy, 1960s TV style, monochrome, high contrast`);
    form.append('grid_size', '1');

    const res = await fetch(DEEPAI_API, {
      method: 'POST',
      headers: { 'api-key': DEEPAI_KEY },
      body: form
    });
    
    if (!res.ok) throw new Error(`DeepAI Status: ${res.status}`);
    const data = await res.json();
    return data.output_url;
  } catch (e) {
    console.warn("DeepAI generation failed, switching to fallback:", e);
    return undefined;
  }
}

// Pollinations.ai is a robust fallback that covers the "Raphael/Mage" requirement 
// by providing high-quality Flux/SDXL models for free without signup.
async function tryPollinations(prompt: string): Promise<string | undefined> {
    try {
        const safePrompt = encodeURIComponent(`(black and white film noir), ${prompt}, grainy, 1960s TV style, monochrome`);
        const seed = Math.floor(Math.random() * 1000000);
        // Using 'flux' model for high fidelity (similar to Mage.space/Raphael quality)
        const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=512&height=384&seed=${seed}&nologo=true&model=flux`;
        
        // Fetch to ensure it's generated and ready (avoids broken image icon in UI)
        const res = await fetch(url);
        if (!res.ok) throw new Error('Pollinations unavailable');
        const blob = await res.blob();
        
        // Convert to Base64 to be consistent
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("All image generation fallbacks failed", e);
        return undefined;
    }
}

export const generateFreeImage = async (prompt: string): Promise<string | undefined> => {
    // 1. Primary: DeepAI Text-to-Image
    const deepAiUrl = await tryDeepAI(prompt);
    if (deepAiUrl) return deepAiUrl;

    // 2. Fallback: Pollinations (Flux)
    return await tryPollinations(prompt);
};
