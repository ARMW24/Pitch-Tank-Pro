import { GoogleGenerativeAI } from "@google/generative-ai";

let aiInstance: any = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your .env file.");
  }
  
  aiInstance = new GoogleGenerativeAI(apiKey);
  return aiInstance;
};

export const getGeminiChatResponse = async (messages: {role: string, text: string}[], contextFiles: any[], currentSlideContent: string) => {
  const ai = getAI();
  
  const systemInstruction = `You are a helpful AI agent representing the founder of this pitch.
Your goal is to answer investor queries professionally, politely, and CONCISELY.

STRICT GUIDELINES:
1. BREVITY: Keep answers under 800 characters unless explicitly asked for a detailed breakdown.
2. RELEVANCE: Answer ONLY what is asked. Do NOT jump to funding targets or ARR projections unless the user asks about financials, plans, or "talk about the project".
3. GREETING: If someone says "Hi" or "Hello", just greet them back warmly and ask how you can help them explore the pitch.

Context from current slide:
${currentSlideContent || 'No slide content available.'}
  
Knowledge Base Files:
${contextFiles.map((f, i) => `File ${i+1} (${f.name}):\n${f.content || 'Content not extracted'}`).join('\n\n')}`;

  const model = ai.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction
  });

  const chat = model.startChat({
    history: messages.slice(0, -1).map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.text }]
    })),
  });

  try {
    const result = await chat.sendMessage(messages[messages.length - 1].text);
    const response = await result.response;
    return response.text() || "I'm unable to answer that right now.";
  } catch (err: any) {
    console.error("Gemini Error:", err);
    if (err.message?.includes("429") || err.message?.includes("QUOTA")) {
      return "The AI consultant is currently at maximum capacity (Usage Quota Reached). Please try again in 1-2 minutes.";
    }
    throw new Error(err.message || "Failed to get AI response.");
  }
};

