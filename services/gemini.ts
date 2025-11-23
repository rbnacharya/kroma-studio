import { GoogleGenAI, Type } from "@google/genai";
import { Scene } from "../types";

// Helper to get client with current key
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const generateScriptScenes = async (topic: string, count: number = 5): Promise<Scene[]> => {
  const ai = getClient();
  
  const prompt = `You are a professional video director. Create a ${count}-scene video script for a video about: "${topic}".
  Return a JSON array of scenes. Each scene needs a visual description suitable for video generation.
  Keep descriptions concise (under 40 words) and visually descriptive.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
          },
          required: ["description"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No script generated");

  try {
    const rawScenes = JSON.parse(text) as { description: string }[];
    return rawScenes.map((s, i) => ({
      id: crypto.randomUUID(),
      order: i + 1,
      description: s.description,
      status: 'pending'
    }));
  } catch (e) {
    console.error("Failed to parse script JSON", e);
    throw new Error("Failed to parse script generation response");
  }
};

export const generateCharacterImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  
  // Using flash image for speed in this demo context, but pro is better for quality.
  // The user prompt asked for character generation.
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: {
      parts: [{ text: `A full body character design on a neutral background. ${prompt}` }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("No image generated");
};

export const generateVideoClip = async (
  prompt: string, 
  startImageBase64: string | null, 
  aspectRatio: '16:9' | '9:16'
): Promise<string> => {
  const ai = getClient();
  
  console.log("Starting video generation...");
  
  let operation;
  
  if (startImageBase64) {
    // Generate with start frame (Character consistency)
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: startImageBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });
  } else {
    // Text to video only
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });
  }

  // Polling
  while (!operation.done) {
    console.log("Polling video operation...");
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed: No URI returned");

  // We need to fetch the actual bytes or a signed URL to play it, 
  // but the prompt says to just "make a youtube style video".
  // The SDK docs say: `const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);`
  // We need to proxy this or fetch it as blob to play in browser locally without exposing key in DOM src?
  // Actually, for a simple React app, fetching as blob URL is safest.
  
  const apiKey = process.env.API_KEY;
  const fetchResponse = await fetch(`${videoUri}&key=${apiKey}`);
  if (!fetchResponse.ok) throw new Error("Failed to download video file");
  
  const blob = await fetchResponse.blob();
  return URL.createObjectURL(blob);
};
