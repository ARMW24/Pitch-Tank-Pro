import { GoogleGenAI } from "@google/genai";

let aiInstance: any = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  // Follow platform instructions strictly: Always use process.env.GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set GEMINI_API_KEY in your environment.");
  }
  
  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
};

export const getGeminiChatResponse = async (messages: {role: string, text: string}[], contextFiles: any[], currentSlideContent: string) => {
  const ai = getAI();
  
  const systemInstruction = `You are the Expert Visionary Founder and C.E.O. of this specific high-growth startup project.
Your goal is to satisfy potential Venture Capitalists (VCs) and Angel Investors. 
Respond with high intelligence, professional charisma, and strategic clarity.

CRITICAL DIRECTIVES:
1. CHARISMA: Be bold yet humble. You believe in your vision 100%. 
2. BREVITY: Investors are busy. Keep responses under 600 characters unless detailing complex metrics.
3. DATA-DRIVEN: Use the "Knowledge Base" and "Slide Content" below as your internal project documentation. If specific numbers aren't found, speak strategically rather than making them up.
4. LANGUAGE: Answer in the SAME LANGUAGE as the user's previous message (Default to English if unsure).
5. GREETING: Warmly acknowledge visitors as potential partners.

Knowledge Base (Your internal docs):
${contextFiles.map((f, i) => `File: ${f.name}\n${f.content || 'Content not extracted'}`).join('\n\n')}

Current Deck Context:
${currentSlideContent || 'No specific slide content visible.'}`;

  const chatMessages = messages.map(m => ({
     role: m.role === 'ai' ? 'model' : 'user',
     parts: [{ text: m.text }]
  }));

  // Try multiple models in order of preference
  const preferredModels = ["gemini-2.0-flash-exp", "gemini-1.5-flash-latest", "gemini-1.5-flash"];
  let finalResponse = "";
  let lastError = "";

  for (const modelName of preferredModels) {
    try {
      const model = ai.models.generateContent({
        model: modelName,
        contents: chatMessages,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      const response = await model;
      finalResponse = response.text || "";
      if (finalResponse) break;
    } catch (err: any) {
      console.warn(`Model ${modelName} failed:`, err.message);
      lastError = err.message;
      continue;
    }
  }

  if (finalResponse) return finalResponse;
  
  if (lastError.includes("429") || lastError.includes("QUOTA")) {
    return "The AI consultant is currently occupied with other investors. Please try again in 1-2 minutes.";
  }
  return "I'm experiencing a temporary technical glitch in my knowledge engine. Let me get back to you shortly.";
};
