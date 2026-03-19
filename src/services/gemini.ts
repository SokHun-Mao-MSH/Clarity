import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GenerationOptions {
  roleBased: boolean;
  chainOfThought: boolean;
}

export async function generateCode(prompt: string, options: GenerationOptions) {
  let finalPrompt = prompt;

  if (options.roleBased) {
    finalPrompt = `Act as a senior front-end developer with expertise in modern, accessible, and performant web development. Your task is to: ${finalPrompt}`;
  }

  if (options.chainOfThought) {
    finalPrompt += `\n\nPlease follow these steps:
1. Analyze the requirements.
2. Plan the structure (HTML).
3. Design the styling (CSS/Tailwind).
4. Implement the interactivity (JavaScript/React).
5. Provide the final code in a single block or separate blocks.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ parts: [{ text: finalPrompt }] }],
    config: {
      temperature: 0.7,
    },
  });

  return response.text;
}
