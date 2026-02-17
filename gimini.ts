
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SimulationState, AIInsight, Language } from "../types";

// Always use the process.env.API_KEY directly for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (state: SimulationState): Promise<AIInsight[]> => {
  const prompt = `
    Context: Virtual Traffic Simulation for Baramati City. Language: ${state.language}.
    Current State:
    - Time: ${state.time}
    - Weather: ${state.weather}
    - Junction Data: ${JSON.stringify(state.junctions.map(j => ({ name: j.name, density: j.density })))}
    
    Analyze traffic and provide 3-4 management insights in ${state.language === 'mr' ? 'Marathi' : state.language === 'hi' ? 'Hindi' : 'English'}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              message: { type: Type.STRING },
              impactScore: { type: Type.NUMBER }
            },
            required: ["type", "message", "impactScore"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
};

export const getBaramatiLiveUpdates = async (lang: Language) => {
  const langName = lang === 'mr' ? 'Marathi' : lang === 'hi' ? 'Hindi' : 'English';
  const prompt = `Act as Baramati Smart City Assistant. Provide a short update on traffic, weather, and road risks in ${langName}. Use bullet points.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }, { googleMaps: {} }] },
    });
    return {
      text: response.text,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    return { text: "...", grounding: [] };
  }
};

export const speakTrafficAlert = async (text: string, lang: Language) => {
  try {
    // Adding context to simulate the requested baritone/legendary voice style
    const voiceStyle = lang === 'hi' ? "एक गहरी, दमदार और स्पष्ट आवाज़ में बोलें: " : 
                       lang === 'mr' ? "एका खोल आणि स्पष्ट आवाजात सांगा: " : 
                       "Speak in a deep, authoritative baritone voice: ";
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: voiceStyle + text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { 
            // 'Fenrir' is a deeper, more masculine voice compared to 'Kore'
            prebuiltVoiceConfig: { voiceName: 'Fenrir' } 
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("TTS Error:", e);
    return null;
  }
};
