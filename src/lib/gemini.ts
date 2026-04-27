import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function parseSMSWithAI(body: string) {
  const prompt = `
    Analyze the following SMS message and extract financial information in JSON format.
    The output should strictly be a JSON object with the following fields:
    - amount: number (the transaction amount)
    - type: "income" | "expense" | "other"
    - category: string (one of: Food, Transport, Rent, Utilities, Entertainment, Shopping, Health, Salary, Investment, Bills, Subscription, Other)
    - bankName: string | null (name of the bank if mentioned, e.g., HDFC, SBI, ICICI, Axis)
    - accountLast4: string | null (last 4 digits of the account number if mentioned)
    - isBill: boolean (true if it's a bill payment reminder or confirmation)
    - isSubscription: boolean (true if it's a recurring subscription payment)
    - description: string (a short, clean description of the transaction)
    - merchantName: string | null (name of the merchant if mentioned)

    Note: The currency is strictly INR (₹).
    SMS: "${body}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    const text = response.text;
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Gemini parsing error:", error);
    return null;
  }
}
