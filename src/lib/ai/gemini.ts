import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/** Default fast model for chat / agent loops */
export const geminiModel = google("gemini-3.6-flash");
