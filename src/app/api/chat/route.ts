import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { geminiModel } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as { messages?: UIMessage[] };
  const messages = body.messages ?? [];

  if (!process.env.GEMINI_API_KEY) {
    return new Response("Missing GEMINI_API_KEY", { status: 500 });
  }

  const result = streamText({
    model: geminiModel,
    system:
      "You are a helpful product co-builder for this Next.js + Supabase app. Be concise, concrete, and action-oriented.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
