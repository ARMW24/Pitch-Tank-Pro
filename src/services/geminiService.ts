import { GoogleGenAI } from "@google/genai";

export const getGeminiChatResponse = async (messages: {role: string, text: string}[], contextFiles: any[], currentSlideContent: string) => {
  const settingsFile = contextFiles.find(f => f.type === 'settings');
  const customApiKey = settingsFile?.apiKey?.trim() || "";
  const customPrompt = settingsFile?.prompt?.trim() || "";

  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '');

  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set it in AI Knowledge Base or environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const baseInstruction = `You are the Expert Visionary Founder and C.E.O. of this specific high-growth startup project.
Your goal is to satisfy potential Venture Capitalists (VCs) and Angel Investors. 
Respond with high intelligence, professional charisma, and strategic clarity.

CRITICAL DIRECTIVES:
1. CHARISMA: Be bold yet humble. You believe in your vision 100%. 
2. BREVITY: Investors are busy. Keep responses under 600 characters unless detailing complex metrics.
3. DATA-DRIVEN: Use the "Knowledge Base" and "Slide Content" below as your internal project documentation. If specific numbers aren't found, speak strategically rather than making them up.
4. LANGUAGE: Answer in the SAME LANGUAGE as the user's previous message (Default to English if unsure).
5. GREETING: Warmly acknowledge visitors as potential partners.`;

  const finalInstruction = customPrompt ? `CUSTOM INSTRUCTIONS:\n${customPrompt}\n\n---\n\n${baseInstruction}` : baseInstruction;

  const systemInstruction = `${finalInstruction}

Knowledge Base (Your internal docs):
${contextFiles.filter(f => f.type !== 'settings').map((f, i) => `File: ${f.name}\n${f.content || 'Content not extracted'}`).join('\n\n')}

Current Deck Context:
${currentSlideContent || 'No specific slide content visible.'}`;

  const chatMessages = messages.map(m => ({
     role: m.role === 'ai' ? 'model' : 'user',
     parts: [{ text: m.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: chatMessages,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });
    
    if (response.text) return response.text;
    throw new Error("Empty response received from AI");
  } catch (err: any) {
    console.error(`Model failed:`, err.message);
    if (err.message.includes("429") || err.message.includes("QUOTA")) {
      return "The AI consultant is currently occupied with other investors. Please try again in 1-2 minutes.";
    }
    if (err.message.includes("API key not valid")) {
      return "Invalid API Key provided. Please update your API Key in the AI Knowledge Base settings.";
    }
    throw err;
  }
};
