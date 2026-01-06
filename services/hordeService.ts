
const HORDE_API = "https://stablehorde.net/api/v2";
const ANONYMOUS_KEY = "0000000000"; // The magic key for free access

interface HordeResponse {
  id: string;
  message?: string;
}

interface HordeStatus {
  finished: number;
  processing: number;
  done: boolean;
  generations?:Array<{ img: string }>; // Returns URL or Base64
}

export const generateHordeImage = async (prompt: string): Promise<string | undefined> => {
  try {
    // 1. Submit the Request
    const payload = {
      prompt: `(black and white film noir), ${prompt}, grainy, 1960s TV style, monochrome, high contrast`,
      params: {
        sampler_name: "k_euler_a",
        cfg_scale: 7.5,
        steps: 20,
        n: 1, // Number of images
        width: 512,
        height: 512,
      },
      nsfw: false,
      censor_nsfw: true,
      models: ["stable_diffusion"], // The classic reliable model
    };

    const submitRes = await fetch(`${HORDE_API}/generate/async`, {
      method: "POST",
      headers: {
        "apikey": ANONYMOUS_KEY,
        "Content-Type": "application/json",
        "Client-Agent": "TwistedLogic:v1.0:Anonymous",
      },
      body: JSON.stringify(payload),
    });

    if (!submitRes.ok) throw new Error("Horde submission failed");
    const submitData: HordeResponse = await submitRes.json();
    const requestId = submitData.id;

    // 2. Poll for Completion (Wait up to 60 seconds)
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 2000)); // Wait 2s
      
      const statusRes = await fetch(`${HORDE_API}/generate/status/${requestId}`, {
        headers: { "Client-Agent": "TwistedLogic:v1.0:Anonymous" }
      });
      
      const status: HordeStatus = await statusRes.json();
      
      if (status.done && status.generations && status.generations.length > 0) {
        // Horde returns a URL to the image (or base64 depending on worker config)
        return status.generations[0].img;
      }
      
      attempts++;
    }
    return undefined; // Timed out

  } catch (e) {
    console.error("AI Horde Error:", e);
    return undefined;
  }
};
