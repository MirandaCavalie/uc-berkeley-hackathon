import type { Interview } from "../types";
import { classifyTask } from "../engine/processes";
import { weeklyHours } from "./evidence";
import type { Session } from "./schema";

/** Only submitted records with a passed evidence gate enter quantitative planning. */
export function toInterview(s: Session): Interview | null {
  if (s.status !== "submitted" || !s.quality.ready || s.record.workflows.some(w => weeklyHours(w) === null)) return null;
  return { id: `live-${s.id}`, name: s.name, role: s.role, team: s.team, status: "completed", invitedAt: s.createdAt, completedAt: s.submittedAt,
    transcript: s.messages.map(m => ({ from: m.role === "user" ? "person" : "ai", text: m.text })),
    context: s.record.context?.value || "", tasks: s.record.workflows.map(w => ({ id: `${s.id}-${w.id}`, name: w.name.value, hoursPerWeek: weeklyHours(w)!, tools: w.tools ? [w.tools.value] : [], process: classifyTask(w.name.value), pain: [w.workaround?.value, w.errorCost?.value, w.exceptions?.value].filter(Boolean).join("\n") })),
    waits: s.record.workflows.map(w => w.handoffs?.value).filter(Boolean).join("\n"), aiToday: s.record.aiUse?.value || "",
    keepHuman: s.record.workflows.map(w => w.humanBoundary?.value).filter(Boolean).join("\n"), satisfaction: null, consent: { status: "accepted", acceptedAt: s.consentAt || undefined },
  };
}
