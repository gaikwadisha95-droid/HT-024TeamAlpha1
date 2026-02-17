
import { GoogleGenAI, Type } from "@google/genai";
import { RouteAnalysis, TrafficLevel } from "../types";

export async function analyzeRouteIntelligence(
  source: string,
  destination: string
): Promise<RouteAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analyze a potential driving route in Baramati city from ${source} to ${destination}. 
  Provide a realistic real-time intelligence report including traffic levels, weather impact, and any potential 5km-ahead emergencies (like roadblocks near major junctions like Pencil Chowk or Bhigwan Road). 
  Be specific to Baramati's layout.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallTraffic: { type: Type.STRING, enum: Object.values(TrafficLevel) },
            estimatedTimeMins: { type: Type.NUMBER },
            weatherCondition: { type: Type.STRING },
            safetyScore: { type: Type.NUMBER, description: "Scale 1-10" },
            alerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['TRAFFIC', 'EMERGENCY', 'WEATHER', 'ROADBLOCK'] },
                  severity: { type: Type.STRING, enum: ['INFO', 'WARNING', 'CRITICAL'] },
                  message: { type: Type.STRING },
                  distanceAheadKm: { type: Type.NUMBER },
                  location: { 
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "[lat, lng] for the alert marker"
                  }
                },
                required: ['type', 'severity', 'message', 'distanceAheadKm', 'location']
              }
            }
          },
          required: ['overallTraffic', 'estimatedTimeMins', 'weatherCondition', 'alerts', 'safetyScore']
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e: any) {
    console.error("AI Service Error:", e);
    // Specifically catch quota/rate limit errors
    if (e.message?.toLowerCase().includes('429') || 
        e.message?.toLowerCase().includes('quota') || 
        e.message?.toLowerCase().includes('limit') ||
        e.message?.toLowerCase().includes('exhausted')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    throw e;
  }
}
