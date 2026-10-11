import { z } from "zod";

const text = (max: number) => z.string().max(max);
export const meetingSchema = z.object({
  id: text(400), title: text(500).min(1), start: text(100), attendees: z.array(text(300)).max(100),
  description: text(10_000), source: z.enum(["sample", "manual", "google"]),
});
export const configSchema = z.object({
  name: text(120), taskId: text(100), goal: text(2_000).min(1), instructions: text(4_000).min(1),
  companyContext: text(4_000), sections: z.array(z.enum(["agenda", "questions", "checklist"])).min(1).max(3),
  source: z.enum(["sample", "manual", "google"]), meeting: meetingSchema, notes: text(12_000),
}).refine((c) => c.source === c.meeting.source, "Meeting source mismatch");
export const briefInputSchema = z.object({
  config: configSchema,
  interview: z.object({
    id: text(100), name: text(200), role: text(200), team: text(200), context: text(6_000),
    aiToday: text(6_000), keepHuman: text(6_000), waits: text(6_000),
    tasks: z.array(z.object({ id: text(100), name: text(500), pain: text(6_000), tools: z.array(text(200)).max(30) })).max(50),
  }),
});
export const briefSchema = z.object({
  summary: text(5_000),
  agenda: z.array(text(2_000)).max(12),
  questions: z.array(text(2_000)).max(12),
  checklist: z.array(text(2_000)).max(12),
  unknowns: z.array(text(2_000)).max(12),
});

export function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}
