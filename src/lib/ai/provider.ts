import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export interface ResolvedModel {
  model: LanguageModel;
  label: string;
}

export function resolveModel(): ResolvedModel | null {
  const preferred = process.env.AI_PROVIDER?.toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const useAnthropic = anthropicKey && (preferred === "anthropic" || !openaiKey);
  if (useAnthropic) {
    const id = process.env.AI_MODEL || "claude-sonnet-5-5";
    return { model: createAnthropic({ apiKey: anthropicKey })(id), label: `Anthropic · ${id}` };
  }
  if (openaiKey) {
    const id = process.env.AI_MODEL || "gpt-5.4-mini";
    return { model: createOpenAI({ apiKey: openaiKey })(id), label: `OpenAI · ${id}` };
  }
  return null;
}
