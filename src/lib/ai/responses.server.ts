import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type ModelMessage } from "ai";

/** Model dùng cho AI nội bộ; cùng dòng Flash với TML AI. */
export const INTERNAL_AI_MODEL = "gemini-3.8-flash";

/** One-shot call to Google Gemini with the internal key; returns the final text. */
export async function runResponsesText(
  request: Request,
  instructions: string,
  messages: ModelMessage[],
) {
  const apiKey = process.env["GOOGLE_AI_INTERNAL_KEY"];
  if (!apiKey?.trim()) throw new Error("AI chưa được cấu hình.");
  const google = createGoogleGenerativeAI({ apiKey });
  const result = await generateText({
    model: google(INTERNAL_AI_MODEL),
    instructions,
    messages,
    abortSignal: request.signal,
  });
  return result.text;
}
