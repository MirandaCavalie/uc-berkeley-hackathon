import type { EvidenceItem } from "../types";
import { daysBetween, lines, parseCsv } from "./text";

export type EventAction = "brief" | "stage" | "comment" | "change-request" | "request" | "result";

export interface WorkEvent {
  id: string;
  evidenceId: string;
  source: string;
  when: string;
  actor: string;
  role: string;
  action: EventAction;
  stage: string;
  detail: string;
  round?: number;
  days?: number;
  hours?: number;
}

export interface PathStage {
  stage: string;
  owner: string;
  occurrences: number;
  days: number;
  events: number;
  actors: string[];
  sources: string[];
  manual: string[];
  onTimeline: boolean;
}

export interface LearnedPath {
  stages: PathStage[];
  loop: { stages: string[]; repeats: number } | null;
  handoffs: number;
  totalDays: number;
  people: number;
  roles: number;
  sources: number;
}

export const stageOptions: { name: string; description: string }[] = [
  { name: "Brief intake", description: "Writing or receiving the campaign brief" },
  { name: "Brief clarification", description: "Questions back and forth about what the brief means" },
  { name: "Moodboard & references", description: "Collecting references, inspiration, or past campaigns" },
  { name: "Concept development", description: "Creating creative routes and concepts" },
  { name: "Creative review", description: "Stakeholders giving feedback on a creative draft (headline, logo, color, imagery)" },
  { name: "Feedback consolidation", description: "Merging feedback from several people into one list" },
  { name: "Revision", description: "Designers producing a new version" },
  { name: "Legal review", description: "Checking claims, substantiation, and regulated wording" },
  { name: "Final approval", description: "Sign-off to ship" },
  { name: "Channel adaptation", description: "Resizing, re-cropping, or reformatting assets for each channel" },
  { name: "Copywriting", description: "Writing headlines, variants, or body copy" },
  { name: "Localization", description: "Translating or adapting for another market or language" },
  { name: "Asset handoff", description: "Exporting, naming, uploading to the DAM or ad platforms" },
  { name: "Reporting", description: "Performance results, metrics, recaps" },
  { name: "Requests", description: "Anything else" },
];

const MANUAL = /\bby hand\b|\bmanual(ly)?\b|\breconcil|\bre-?export|\bpulled\b|\bre-?copied\b|\bnaming fixes\b/i;

const requestStages: [RegExp, string][] = [
  [/resiz|adapt|sizes|dark mode|crop/i, "Channel adaptation"],
  [/translat|locali|\bfr\b|market/i, "Localization"],
  [/legal|claim/i, "Legal review"],
  [/reference|moodboard|inspiration/i, "Moodboard & references"],
  [/naming|export|dam|upload/i, "Asset handoff"],
  [/headline|copy|variant/i, "Copywriting"],
  [/recap|report|deck|performance/i, "Reporting"],
];

function classifyRequest(text: string): string {
  return requestStages.find(([re]) => re.test(text))?.[1] ?? "Requests";
}

function feedbackStage(actor: string, role: string, text: string): string {
  return /legal|counsel|compliance/i.test(`${actor} ${role}`) || /\bclaim|substantiat/i.test(text) ? "Legal review" : "Creative review";
}

export function extractEvents(evidence: EvidenceItem[]): WorkEvent[] {
  const out: WorkEvent[] = [];
  const push = (ev: EvidenceItem, e: Omit<WorkEvent, "id" | "evidenceId" | "source">) =>
    out.push({ ...e, id: `${ev.id}-${out.length}`, evidenceId: ev.id, source: ev.source });

  for (const ev of evidence) {
    const rows = parseCsv(ev.content);
    if (rows.length && "stage" in rows[0]) {
      for (const r of rows) {
        push(ev, {
          when: r.start ?? "",
          actor: r.owner ?? "Unknown",
          role: "",
          action: "stage",
          stage: r.stage,
          detail: r.notes || `${r.stage} completed`,
          round: Number(r.round) || undefined,
          days: r.start && r.end ? daysBetween(r.start, r.end) : undefined,
        });
      }
      continue;
    }
    if (rows.length && "channel" in rows[0]) {
      for (const r of rows) {
        push(ev, { when: "", actor: r.channel, role: "Channel", action: "result", stage: "Reporting", detail: r.notes || `CTR ${r.ctr ?? "—"}` });
      }
      continue;
    }

    const from = ev.content.match(/From:\s*([^(\n·]+?)\s*\(([^)]+)\)/);
    const owner = ev.content.match(/Owner:\s*([^,·\n]+?)(?:,\s*([^·\n]+?))?\s*(?:·|$)/m);
    if (owner && ev.kind === "brief") {
      push(ev, { when: "", actor: owner[1].trim(), role: owner[2]?.trim() ?? "", action: "brief", stage: "Brief intake", detail: lines(ev.content)[0] });
    }

    for (const line of lines(ev.content)) {
      const slack = line.match(/^\[([^\]]+)\]\s*([^:(]+?)(?:\s*\(([^)]+)\))?:\s*(.+)$/);
      if (slack) {
        const [, when, actor, role = "", text] = slack;
        push(ev, { when, actor: actor.trim(), role, action: "comment", stage: feedbackStage(actor, role, text), detail: text });
        continue;
      }
      const bullet = line.match(/^[-*•]\s*([^:(]+?)\s*\(([^)]+)\):\s*(.+)$/);
      if (bullet) {
        const [, actor, role, text] = bullet;
        push(ev, { when: "", actor: actor.trim(), role, action: "comment", stage: feedbackStage(actor, role, text), detail: text });
        continue;
      }
      const ticket = line.match(/^#(\d+)\s+(.+?)\s+·\s+(.+?)(?:\s+·\s+est\s+(\d+(?:\.\d+)?)\s*h)?$/i);
      if (ticket) {
        const [, num, title, team, est] = ticket;
        push(ev, { when: `#${num}`, actor: team, role: "", action: "request", stage: classifyRequest(title), detail: title, hours: est ? Number(est) : undefined });
        continue;
      }
      const numbered = from && line.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) {
        push(ev, { when: "", actor: from[1].trim(), role: from[2], action: "change-request", stage: feedbackStage(from[1], from[2], numbered[1]), detail: numbered[1] });
      }
    }
  }
  return out;
}

export function reconstructPath(events: WorkEvent[]): LearnedPath {
  const timeline = events.filter((e) => e.action === "stage");
  const byStage = new Map<string, PathStage>();
  const touch = (name: string, onTimeline: boolean, owner = "") => {
    let s = byStage.get(name);
    if (!s) {
      s = { stage: name, owner, occurrences: 0, days: 0, events: 0, actors: [], sources: [], manual: [], onTimeline };
      byStage.set(name, s);
    }
    return s;
  };

  for (const e of timeline) {
    const s = touch(e.stage, true, e.actor);
    s.occurrences += 1;
    s.days += e.days ?? 0;
    if (MANUAL.test(e.detail)) s.manual.push(e.detail);
  }
  for (const e of events) {
    const s = touch(e.stage, false, e.actor);
    s.events += 1;
    if (e.action !== "result" && !s.actors.includes(e.actor)) s.actors.push(e.actor);
    if (!s.sources.includes(e.source)) s.sources.push(e.source);
    if (e.action === "request" && MANUAL.test(e.detail)) s.manual.push(e.detail);
  }

  const stages = [...byStage.values()].sort((a, b) => Number(b.onTimeline) - Number(a.onTimeline));
  const looped = stages.filter((s) => s.occurrences > 1);
  let handoffs = 0;
  for (let i = 1; i < timeline.length; i++) if (timeline[i].actor !== timeline[i - 1].actor) handoffs++;

  const starts = timeline.map((e) => Date.parse(e.when)).filter(Number.isFinite);
  const ends = timeline.map((e) => Date.parse(e.when) + (e.days ?? 0) * 86_400_000).filter(Number.isFinite);
  const totalDays = starts.length ? Math.round((Math.max(...ends) - Math.min(...starts)) / 86_400_000) : 0;

  return {
    stages,
    loop: looped.length ? { stages: looped.map((s) => s.stage), repeats: Math.max(...looped.map((s) => s.occurrences)) } : null,
    handoffs,
    totalDays,
    people: new Set(events.filter((e) => ["brief", "comment", "change-request"].includes(e.action)).map((e) => e.actor)).size,
    roles: new Set(timeline.map((e) => e.actor)).size,
    sources: new Set(events.map((e) => e.source)).size,
  };
}
