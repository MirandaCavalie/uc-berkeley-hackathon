import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveModel } from "@/lib/ai/provider";
import { launchPrompt, radarPrompt, reviewPrompt, studioPrompt } from "@/lib/ai/prompts";
import { runLaunch } from "@/lib/engine/launch";
import { runRadar } from "@/lib/engine/radar";
import { runReview } from "@/lib/engine/review";
import { runStudio } from "@/lib/engine/studio";
import { tasks, type TaskKey } from "@/lib/schemas";
import type { AnalysisEngine, BrandKit, EvidenceItem, LaunchInput, Reference, ReviewInput, StudioInput } from "@/lib/types";

export const maxDuration = 120;

const brandSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  voice: z.string(),
  audience: z.string(),
  colors: z.array(z.object({ name: z.string(), hex: z.string(), usage: z.string() })),
  typography: z.object({ display: z.string(), body: z.string() }),
  bannedWords: z.array(z.string()),
  claimRules: z.array(z.object({ avoid: z.string(), use: z.string() })),
  guidelines: z.array(z.string()),
  logoDataUrl: z.string().nullable(),
});

const evidenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["brief", "feedback", "approvals", "requests", "performance", "other"]),
  source: z.string(),
  content: z.string().max(60_000),
  addedAt: z.string(),
});

const referenceSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "link", "note"]),
  title: z.string(),
  value: z.string(),
  addedAt: z.string(),
});

const payloads = {
  radar: z.object({ brand: brandSchema, evidence: z.array(evidenceSchema).min(1).max(40) }),
  review: z.object({ brand: brandSchema, input: z.object({ assetName: z.string(), feedback: z.string().min(10).max(60_000) }) }),
  launch: z.object({ brand: brandSchema, input: z.object({ brief: z.string().min(20).max(30_000), channels: z.array(z.string()).min(1).max(12) }) }),
  studio: z.object({
    brand: brandSchema,
    input: z.object({ theme: z.string().min(3).max(4_000), constraints: z.string().max(4_000) }),
    references: z.array(referenceSchema).max(40),
  }),
};

function isTask(task: string): task is TaskKey {
  return task in tasks;
}

function runLocal(task: TaskKey, body: unknown) {
  switch (task) {
    case "radar": {
      const { evidence, brand } = body as { evidence: EvidenceItem[]; brand: BrandKit };
      return runRadar(evidence, brand);
    }
    case "review": {
      const { input, brand } = body as { input: ReviewInput; brand: BrandKit };
      return runReview(input, brand);
    }
    case "launch": {
      const { input, brand } = body as { input: LaunchInput; brand: BrandKit };
      return runLaunch(input, brand);
    }
    case "studio": {
      const { input, brand, references } = body as { input: StudioInput; brand: BrandKit; references: Reference[] };
      return runStudio(input, brand, references);
    }
  }
}

function promptFor(task: TaskKey, body: unknown) {
  switch (task) {
    case "radar": {
      const { evidence, brand } = body as { evidence: EvidenceItem[]; brand: BrandKit };
      return radarPrompt(evidence, brand);
    }
    case "review": {
      const { input, brand } = body as { input: ReviewInput; brand: BrandKit };
      return reviewPrompt(input, brand);
    }
    case "launch": {
      const { input, brand } = body as { input: LaunchInput; brand: BrandKit };
      return launchPrompt(input, brand);
    }
    case "studio": {
      const { input, brand, references } = body as { input: StudioInput; brand: BrandKit; references: Reference[] };
      return studioPrompt(input, brand, references);
    }
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/ai/[task]">) {
  const { task } = await ctx.params;
  if (!isTask(task)) return Response.json({ error: `Unknown task “${task}”.` }, { status: 404 });

  const parsed = payloads[task].safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request.", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const body = parsed.data;

  const resolved = resolveModel();
  const forceLocal = new URL(request.url).searchParams.get("engine") === "local";

  if (resolved && !forceLocal) {
    try {
      const { system, prompt } = promptFor(task, body);
      const schema: z.ZodType<unknown> = tasks[task];
      const { output } = await generateText({
        model: resolved.model,
        system,
        prompt,
        output: Output.object({ schema }),
        maxRetries: 1,
      });
      const engine: AnalysisEngine = { kind: "llm", label: resolved.label };
      return Response.json({ result: output, engine, warning: null });
    } catch (error) {
      console.error(`[ai:${task}]`, error);
      const engine: AnalysisEngine = { kind: "local", label: "Local engine (fallback)" };
      return Response.json({
        result: runLocal(task, body),
        engine,
        warning: `${resolved.label} failed (${error instanceof Error ? error.message.slice(0, 140) : "unknown error"}). Showing the local engine's analysis instead.`,
      });
    }
  }

  const engine: AnalysisEngine = { kind: "local", label: "Local engine" };
  return Response.json({ result: runLocal(task, body), engine, warning: null });
}
