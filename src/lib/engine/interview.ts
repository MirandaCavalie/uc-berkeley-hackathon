import type { WorkMode } from "../schemas";
import type { EvidenceItem, Interview, InterviewTask, RoiAssumptions } from "../types";

export const WEEKS_PER_MONTH = 4.33;
const CAMPAIGNS_PER_MONTH = 2;
const MAX_TASKS = 5;

export const defaultRoi: RoiAssumptions = {
  hourlyCost: 65,
  capture: { automate: 0.7, assist: 0.35, human: 0 },
  toolCostPerMonth: 2000,
  manualHoursPerInterview: 3,
};

export const taskStages: { name: string; re: RegExp; mode: WorkMode }[] = [
  { name: "Channel adaptation & resizing", re: /resiz|sizes|crop|9:16|adapt|format|cut ?downs?|re-?cop/i, mode: "automate" },
  { name: "Asset handoff & trafficking", re: /naming|export|dam\b|upload|traffick|handoff|hand-off|file/i, mode: "automate" },
  { name: "Creative performance recap", re: /report|recap|dashboard|ctr|cpa|metrics|numbers|performance/i, mode: "automate" },
  { name: "Stakeholder creative review", re: /present|creative review|review meeting/i, mode: "human" },
  { name: "Status updates & meetings", re: /status|update|standup|meeting|chas|follow(ing)? up|nudg|tracker/i, mode: "automate" },
  { name: "Feedback consolidation", re: /feedback|comments?|consolidat|reconcil|round/i, mode: "assist" },
  { name: "Brand & legal compliance check", re: /legal|claims?|compliance|brand check|substantiat|disclaimer/i, mode: "assist" },
  { name: "Copy variants & localization", re: /copy|variant|headline|translat|locali|caption|subject line/i, mode: "assist" },
  { name: "Brief intake & clarification", re: /brief|intake|clarif|kickoff|kick-off|requirements/i, mode: "assist" },
  { name: "Reference & moodboard gathering", re: /reference|moodboard|inspiration|pinterest|research/i, mode: "assist" },
  { name: "Ad-hoc questions & requests", re: /questions?|requests?|ad[- ]hoc|ping|answering/i, mode: "assist" },
  { name: "Concept development", re: /concept|idea|territor|campaign idea|creative direction/i, mode: "human" },
  { name: "Design revision", re: /revis|design|layout|retouch|edit/i, mode: "human" },
  { name: "Final approval", re: /approv|sign[- ]?off/i, mode: "human" },
];

export function classifyTask(text: string): { stage: string; mode: WorkMode } {
  const hit = taskStages.find((s) => s.re.test(text));
  return hit ? { stage: hit.name, mode: hit.mode } : { stage: "Other", mode: "assist" };
}

const toolNames: [RegExp, string][] = [
  [/figma/i, "Figma"],
  [/photoshop|\bps\b/i, "Photoshop"],
  [/after effects/i, "After Effects"],
  [/slack/i, "Slack"],
  [/e-?mail|gmail|outlook/i, "Email"],
  [/asana/i, "Asana"],
  [/jira/i, "Jira"],
  [/notion/i, "Notion"],
  [/workfront/i, "Workfront"],
  [/monday/i, "Monday"],
  [/google docs|\bdocs\b/i, "Google Docs"],
  [/sheets|excel|spreadsheet/i, "Sheets"],
  [/looker/i, "Looker"],
  [/slides|powerpoint|deck/i, "Slides"],
  [/\bdam\b|bynder|brandfolder/i, "DAM"],
  [/meta ads|ads manager|facebook ads/i, "Meta Ads"],
  [/google ads/i, "Google Ads"],
  [/frame\.io/i, "Frame.io"],
  [/canva/i, "Canva"],
  [/drive/i, "Drive"],
];

export function parseTools(text: string): string[] {
  return toolNames.filter(([re]) => re.test(text)).map(([, name]) => name);
}

const wordNumbers: Record<string, number> = { an: 1, a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12 };

/** Hours per week, or null when the answer has no usable amount. */
export function parseHours(text: string): number | null {
  const t = text.toLowerCase();
  let hours: number | null = null;
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(h|hours?|hrs?)\b/);
  const num = t.match(/(\d+(?:\.\d+)?)\s*(h|hours?|hrs?|min|minutes?|days?)\b/);
  const word = t.match(/\b(an|a|one|two|three|four|five|six|eight|ten|twelve)\s+(hours?|days?)\b/);
  if (range) hours = (Number(range[1]) + Number(range[2])) / 2;
  else if (num) hours = Number(num[1]) * (num[2].startsWith("min") ? 1 / 60 : num[2].startsWith("day") ? 8 : 1);
  else if (/half (a )?day/.test(t)) hours = 4;
  else if (/full day|whole day/.test(t)) hours = 8;
  else if (word) hours = wordNumbers[word[1]] * (word[2].startsWith("day") ? 8 : 1);
  if (hours == null) return null;
  if (/\bper (campaign|launch)|each (campaign|launch)|every (campaign|launch)/.test(t)) hours = (hours * CAMPAIGNS_PER_MONTH) / WEEKS_PER_MONTH;
  else if (/\bper (month|mo)\b|a month|each month|monthly/.test(t)) hours = hours / WEEKS_PER_MONTH;
  else if (/\bper day|a day|each day|daily|every day/.test(t) && !/half|full|whole/.test(t)) hours = hours * 5;
  return Math.round(hours * 10) / 10;
}

export function parseTaskList(text: string): string[] {
  const parts = text.includes("\n") ? text.split(/\r?\n/) : text.split(/;|,(?![^(]*\))/);
  return parts
    .map((p) => p.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((p) => p.length > 2)
    .slice(0, MAX_TASKS);
}

export type Phase = "intro" | "tasks" | "hours" | "hoursProbe" | "pain" | "rounds" | "roundHours" | "waits" | "human" | "rating" | "review";

/** Roles that live inside the feedback loop get the review-loop questions. */
export const CREATIVE_ROLE = /design|creative|copy|art|production|social|brand|content|video/i;

function parseRounds(text: string): number | null {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const nums = [...text.toLowerCase().matchAll(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six)\b/g)]
    .map((m) => words[m[1]] ?? Number(m[1]))
    .filter((n) => n > 0 && n <= 12)
    .slice(0, 2);
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
}

export interface RunnerState {
  phase: Phase;
  taskIndex: number;
  interview: Interview;
}

const firstName = (name: string) => name.split(" ")[0];

export function promptFor(state: RunnerState, company: string): string {
  const { interview: iv, taskIndex } = state;
  const task = iv.tasks[taskIndex]?.name;
  switch (state.phase) {
    case "intro":
      return `Hi ${firstName(iv.name)}. I'm mapping how campaign work actually gets done at ${company}, so the team can decide what to automate and what stays human. It takes about 8 minutes. To start: what's your part in a typical campaign?`;
    case "tasks":
      return "Which tasks do you repeat every campaign? One per line is easiest.";
    case "hours":
      return `About how long does “${task}” take you in a typical week, and in which tools?`;
    case "hoursProbe":
      return `Roughly: an hour, half a day, or a full day a week on “${task}”?`;
    case "pain":
      return `What makes “${task}” slow or frustrating?`;
    case "rounds":
      return "How many feedback rounds does a typical asset go through before it's approved?";
    case "roundHours":
      return "When a round of feedback comes in, how long does it take to turn it into one clear list of changes?";
    case "waits":
      return "Where does your work wait on someone else: feedback, approvals, handoffs?";
    case "human":
      return "Which part of your work should never be automated?";
    case "rating":
      return "Last one: how was this conversation, from 1 to 5?";
    case "review":
      return "Thanks. Here's what I captured. Fix anything that's off, then submit.";
  }
}

/** The same guide as plain text, for running the interview live on a call. */
export function designerGuide(): string {
  return [
    "Designer interview: the feedback loop",
    "",
    "1. What's your part in a typical campaign?",
    "2. Which tasks do you repeat every campaign?",
    "3. For each task: about how long does it take in a typical week, and in which tools?",
    "4. For each task: what makes it slow or frustrating?",
    "5. How many feedback rounds does a typical asset go through before it's approved?",
    "6. When a round of feedback comes in, how long does it take to turn it into one clear list of changes?",
    "7. Tell me about the last time two reviewers, or a reviewer and the brand book, disagreed. What happened?",
    "8. Where does your work wait on someone else: feedback, approvals, handoffs?",
    "9. Which part of your work should never be automated?",
    "10. If one revision round per campaign disappeared, what would you do with that time?",
    "",
    "Capture exact quotes. Type their answers into Interviews to add them to the findings.",
  ].join("\n");
}

const uid = () => Math.random().toString(36).slice(2, 8);

export function answer(state: RunnerState, text: string): RunnerState {
  const iv = { ...state.interview, tasks: [...state.interview.tasks] };
  const at = (phase: Phase, taskIndex = state.taskIndex): RunnerState => ({ phase, taskIndex, interview: iv });
  const task = iv.tasks[state.taskIndex];

  switch (state.phase) {
    case "intro":
      iv.context = text;
      return at("tasks");
    case "tasks": {
      const names = parseTaskList(text);
      if (!names.length) return at("tasks");
      iv.tasks = names.map((name) => ({ id: `t-${uid()}`, name, hoursPerWeek: 0, tools: [], pain: "", ...classifyTask(name) }));
      return at("hours", 0);
    }
    case "hours":
    case "hoursProbe": {
      const hours = parseHours(text);
      const tools = parseTools(text);
      iv.tasks[state.taskIndex] = { ...task, hoursPerWeek: hours ?? task.hoursPerWeek, tools: tools.length ? tools : task.tools };
      if (hours == null && state.phase === "hours") return at("hoursProbe");
      return at("pain");
    }
    case "pain": {
      const refined = classifyTask(`${task.name} ${text}`);
      iv.tasks[state.taskIndex] = { ...task, pain: text, ...(task.stage === "Other" ? refined : {}) };
      if (state.taskIndex + 1 < iv.tasks.length) return at("hours", state.taskIndex + 1);
      return CREATIVE_ROLE.test(iv.role) ? at("rounds") : at("waits");
    }
    case "rounds":
      iv.loop = { rounds: parseRounds(text), hoursPerRound: iv.loop?.hoursPerRound ?? null };
      return at("roundHours");
    case "roundHours": {
      const t = text.toLowerCase();
      const n = t.match(/(\d+(?:\.\d+)?)\s*(h|hours?|hrs?|min|minutes?|days?)\b/);
      const hours = n
        ? Number(n[1]) * (n[2].startsWith("min") ? 1 / 60 : n[2].startsWith("day") ? 8 : 1)
        : /half (a )?day/.test(t)
          ? 4
          : /full day|whole day/.test(t)
            ? 8
            : /\ban hour\b|\bone hour\b/.test(t)
              ? 1
              : null;
      iv.loop = { rounds: iv.loop?.rounds ?? null, hoursPerRound: hours != null ? Math.round(hours * 10) / 10 : null };
      return at("waits");
    }
    case "waits":
      iv.waits = text;
      return at("human");
    case "human":
      iv.keepHuman = text;
      return at("rating");
    case "rating": {
      const n = Number(text.match(/[1-5]/)?.[0]);
      iv.satisfaction = Number.isFinite(n) ? n : null;
      return at("review");
    }
    case "review":
      return state;
  }
}

/** Resumes a partly-answered interview from its transcript. */
export function replay(interview: Interview): RunnerState {
  const answers = interview.transcript.filter((m) => m.from === "person").map((m) => m.text);
  let state: RunnerState = {
    phase: "intro",
    taskIndex: 0,
    interview: { ...interview, tasks: [], context: "", waits: "", keepHuman: "", satisfaction: null, loop: undefined },
  };
  for (const a of answers) state = answer(state, a);
  return state;
}

export const effectiveMode = (t: InterviewTask): WorkMode => (t.judgment?.applied ? (t.judgment.label as WorkMode) : t.mode);

export interface Finding {
  stage: string;
  mode: WorkMode;
  hoursPerMonth: number;
  recoverableHours: number;
  annualSavings: number;
  people: string[];
  roles: string[];
  tools: string[];
  tasks: (InterviewTask & { person: string; role: string })[];
  waitMentions: string[];
  keepHuman: { person: string; text: string }[];
}

export interface DiscoveryResults {
  invited: number;
  completed: number;
  completionRate: number;
  waveDays: number | null;
  taskCount: number;
  hoursPerMonth: number;
  recoverableHours: number;
  annualSavings: number;
  firstMonthRoi: number | null;
  discoveryHoursSaved: number;
  avgSatisfaction: number | null;
  wouldTalkAgain: number | null;
  hoursByMode: Record<WorkMode, number>;
  findings: Finding[];
}

const round = (n: number) => Math.round(n);

export function summarize(interviews: Interview[], roi: RoiAssumptions): DiscoveryResults {
  const done = interviews.filter((i) => i.status === "completed");
  const byStage = new Map<string, Finding>();
  const hoursByMode: Record<WorkMode, number> = { automate: 0, assist: 0, human: 0 };

  for (const iv of done) {
    for (const t of iv.tasks) {
      const mode = effectiveMode(t);
      const hours = t.hoursPerWeek * WEEKS_PER_MONTH;
      hoursByMode[mode] += hours;
      let f = byStage.get(t.stage);
      if (!f) {
        f = { stage: t.stage, mode, hoursPerMonth: 0, recoverableHours: 0, annualSavings: 0, people: [], roles: [], tools: [], tasks: [], waitMentions: [], keepHuman: [] };
        byStage.set(t.stage, f);
      }
      f.hoursPerMonth += hours;
      f.recoverableHours += hours * roi.capture[mode];
      f.tasks.push({ ...t, person: iv.name, role: iv.role });
      if (!f.people.includes(iv.name)) f.people.push(iv.name);
      if (!f.roles.includes(iv.role)) f.roles.push(iv.role);
      for (const tool of t.tools) if (!f.tools.includes(tool)) f.tools.push(tool);
    }
  }

  for (const iv of done) {
    for (const f of byStage.values()) {
      const stage = taskStages.find((s) => s.name === f.stage);
      if (stage && iv.waits && stage.re.test(iv.waits)) f.waitMentions.push(iv.name);
      if (stage && iv.keepHuman && stage.re.test(iv.keepHuman)) f.keepHuman.push({ person: iv.name, text: iv.keepHuman });
    }
  }

  const findings = [...byStage.values()]
    .map((f) => {
      const modeHours: Record<WorkMode, number> = { automate: 0, assist: 0, human: 0 };
      for (const t of f.tasks) modeHours[effectiveMode(t)] += t.hoursPerWeek;
      const mode = (Object.entries(modeHours) as [WorkMode, number][]).sort((a, b) => b[1] - a[1])[0][0];
      return {
        ...f,
        mode,
        hoursPerMonth: round(f.hoursPerMonth),
        recoverableHours: round(f.recoverableHours),
        annualSavings: round(f.recoverableHours * roi.hourlyCost * 12),
      };
    })
    .sort((a, b) => b.recoverableHours - a.recoverableHours || b.people.length - a.people.length);

  const recoverable = findings.reduce((n, f) => n + f.recoverableHours, 0);
  const monthlySavings = recoverable * roi.hourlyCost;
  const rated = done.filter((i) => i.satisfaction != null);
  const times = done.flatMap((i) => [i.invitedAt, i.completedAt ?? i.invitedAt]).map((d) => new Date(d).getTime());

  return {
    invited: interviews.length,
    completed: done.length,
    completionRate: interviews.length ? round((done.length / interviews.length) * 100) : 0,
    waveDays: times.length ? Math.max(1, Math.ceil((Math.max(...times) - Math.min(...times)) / 86_400_000)) : null,
    taskCount: done.reduce((n, i) => n + i.tasks.length, 0),
    hoursPerMonth: round(done.reduce((n, i) => n + i.tasks.reduce((m, t) => m + t.hoursPerWeek, 0), 0) * WEEKS_PER_MONTH),
    recoverableHours: recoverable,
    annualSavings: round(monthlySavings * 12),
    firstMonthRoi: roi.toolCostPerMonth > 0 ? round(((monthlySavings - roi.toolCostPerMonth) / roi.toolCostPerMonth) * 100) : null,
    discoveryHoursSaved: round(done.length * roi.manualHoursPerInterview),
    avgSatisfaction: rated.length ? Math.round((rated.reduce((n, i) => n + (i.satisfaction ?? 0), 0) / rated.length) * 10) / 10 : null,
    wouldTalkAgain: rated.length ? round((rated.filter((i) => (i.satisfaction ?? 0) >= 4).length / rated.length) * 100) : null,
    hoursByMode: { automate: round(hoursByMode.automate), assist: round(hoursByMode.assist), human: round(hoursByMode.human) },
    findings,
  };
}

export const INTERVIEW_EVIDENCE_ID = "ev-interviews";

/** Interview answers in the request-queue and quote formats that Radar and Learning already parse. */
export function interviewsToEvidence(interviews: Interview[]): Omit<EvidenceItem, "addedAt"> | null {
  const done = interviews.filter((i) => i.status === "completed");
  if (!done.length) return null;
  let n = 100;
  const lines = [`Team interviews: ${done.length} people, async AI-led`, ""];
  for (const iv of done) {
    for (const t of iv.tasks) {
      const perCampaign = Math.round(((t.hoursPerWeek * WEEKS_PER_MONTH) / CAMPAIGNS_PER_MONTH) * 10) / 10;
      lines.push(`#${++n} ${t.name} (${t.stage}) · ${iv.role} · est ${perCampaign}h`);
    }
  }
  lines.push("");
  for (const iv of done) {
    for (const t of iv.tasks) if (t.pain) lines.push(`- ${iv.name} (${iv.role}): ${t.pain}`);
    if (iv.waits) lines.push(`- ${iv.name} (${iv.role}): ${iv.waits}`);
  }
  return {
    id: INTERVIEW_EVIDENCE_ID,
    title: `Team interviews (${done.length})`,
    kind: "requests",
    source: "Interviews",
    content: lines.join("\n"),
  };
}
