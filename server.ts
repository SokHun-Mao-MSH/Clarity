import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Allow cross-origin requests
  app.use(cors({ origin: true }));
  app.use(express.json());

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Vide Code Backend is running" });
  });

  app.post("/api/explain", async (req, res) => {
    try {
      const { inputCode, language, outputLanguage, actionType } = req.body;
      if (!inputCode) {
        return res.status(400).json({ error: "Input code is required" });
      }

      const prompt = `Act as an expert software engineer and helpful teacher. 
The user provided code in ${language}.
Action requested: ${actionType}.
Provide the response exclusively in ${outputLanguage}.
Format the output in Markdown.

Code:
\`\`\`
${inputCode}
\`\`\`
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      res.json({ result: response.text });
    } catch (error) {
      console.error("Failed to call AI API:", error);
      res.status(500).json({ error: "An error occurred while describing the code" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
