import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function categorizeTransaction(description: string) {
  try {
    const prompt = `Categorize this transaction description into one of these categories: Food, Transport, Rent, Utilities, Entertainment, Shopping, Health, Salary, Investment, Other.
    Description: "${description}"
    Return only the category name.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text?.trim() || "Other";
  } catch (error) {
    return "Other";
  }
}
