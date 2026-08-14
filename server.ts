import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Server-side Gemini API endpoints
  app.post("/api/gemini/parse-sms", async (req, res) => {
    try {
      const { body } = req.body;
      if (!body) {
        return res.status(400).json({ error: "SMS body is required" });
      }

      const ai = getAI();
      if (!ai) {
        return res.status(503).json({ error: "GEMINI_API_KEY is not configured on the server" });
      }

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

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return res.json({ result: JSON.parse(jsonMatch[0]) });
      }
      return res.json({ result: null });
    } catch (error: any) {
      console.error("Gemini SMS parse error:", error);
      return res.status(500).json({ error: error.message || "Failed to parse SMS" });
    }
  });

  app.post("/api/gemini/categorize", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description) {
        return res.json({ category: "Other" });
      }

      const ai = getAI();
      if (!ai) {
        return res.json({ category: "Other" });
      }

      const prompt = `Categorize this transaction description into one of these categories: Food, Transport, Rent, Utilities, Entertainment, Shopping, Health, Salary, Investment, Other.
Description: "${description}"
Return only the single category name.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      const category = response.text?.trim() || "Other";
      return res.json({ category });
    } catch (error: any) {
      console.error("Gemini categorize error:", error);
      return res.json({ category: "Other" });
    }
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
