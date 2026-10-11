import { z } from "zod";

export const dimensions = ["trigger", "inputs", "steps", "outputs", "tools", "handoffs", "frequency", "time", "exceptions", "approvals", "errorCost", "workaround", "example", "humanBoundary"] as const;
export type Dimension = typeof dimensions[number];
export const labels: Record<Dimension, string> = {
  trigger: "What starts the work", inputs: "Inputs and formats", steps: "Manual steps", outputs: "Result and destination",
  tools: "Systems and tools", handoffs: "Handoffs and waiting", frequency: "Volume and frequency", time: "Active time",
  exceptions: "Exceptions", approvals: "Approval rules", errorCost: "Cost of an error", workaround: "Current workaround",
  example: "A recent real example", humanBoundary: "What must stay human",
};
export const citationSchema = z.object({ messageId: z.string(), quote: z.string().min(1).max(1500) });
export const factSchema = z.object({ value: z.string().min(1).max(2500), citations: z.array(citationSchema).min(1).max(6) });
const facts = Object.fromEntries(dimensions.map(key => [key, factSchema.nullable()])) as Record<Dimension, z.ZodNullable<typeof factSchema>>;
export const workflowSchema = z.object({
  id: z.string().min(1).max(80), name: factSchema,
  ...facts,
  timing: z.object({
    minutesPerRun: z.number().min(0).max(10080),
    runsPerPeriod: z.number().min(0).max(100000),
    period: z.enum(["day", "week", "month"]),
    daysPerWeek: z.number().int().min(1).max(7).nullable(),
    citations: z.array(citationSchema).min(1).max(6),
  }).nullable(),
});
export const recordSchema = z.object({
  context: factSchema.nullable(), aiUse: factSchema.nullable(),
  workflows: z.array(workflowSchema).max(3),
  contradictions: z.array(z.string().max(800)).max(10),
});
export type Fact = z.infer<typeof factSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type WorkRecord = z.infer<typeof recordSchema>;
export type Message = { id: string; role: "assistant" | "user"; text: string; createdAt: string };
export type Quality = { missing: string[]; flags: string[]; coverage: number; ready: boolean };
export type Session = {
  scope: Settings;
  id: string; name: string; email: string; role: string; team: string;
  status: "invited" | "active" | "review" | "submitted" | "declined" | "revoked";
  createdAt: string; expiresAt: string; consentAt: string | null; submittedAt: string | null;
  version: number; messages: Message[]; record: WorkRecord; quality: Quality;
  trace: { node: string; detail: string }[];
  delivery: { status: "not_sent" | "sending" | "accepted" | "failed" | "uncertain"; at: string | null };
};
export type Settings = { company: string; purpose: string; ownerContact: string; retentionDays: number };
export type Access = { role: "owner" | "lead"; team: string | null };
export type ParticipantView = Omit<Session, "email" | "delivery"> & { settings: Settings; aiConfigured: boolean };
export const emptyRecord = (): WorkRecord => ({ context: null, aiUse: null, workflows: [], contradictions: [] });
export const settingsSchema = z.object({ company: z.string().trim().min(1).max(160), purpose: z.string().trim().min(10).max(1500), ownerContact: z.string().email().max(200), retentionDays: z.number().int().min(7).max(365) });
export const inviteSchema = z.object({ name: z.string().trim().min(1).max(160), email: z.string().email().max(200), role: z.string().trim().min(1).max(160), team: z.string().trim().min(1).max(100) });
