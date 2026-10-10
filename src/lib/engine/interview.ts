import type { Interview } from "../types";
import { classifyTask, OTHER } from "./processes";

export const WEEKS_PER_MONTH = 4.33;
const MAX_TASKS = 5;

const toolNames: [RegExp, string][] = [
  [/excel|spreadsheet/i, "Excel"],
  [/google sheets|\bsheets\b/i, "Google Sheets"],
  [/slack/i, "Slack"],
  [/teams\b/i, "Teams"],
  [/e-?mail|gmail|outlook|inbox/i, "Email"],
  [/salesforce/i, "Salesforce"],
  [/hubspot/i, "HubSpot"],
  [/zendesk/i, "Zendesk"],
  [/netsuite/i, "NetSuite"],
  [/\bsap\b/i, "SAP"],
  [/quickbooks/i, "QuickBooks"],
  [/workday/i, "Workday"],
  [/bamboo/i, "BambooHR"],
  [/jira/i, "Jira"],
  [/asana/i, "Asana"],
  [/notion/i, "Notion"],
  [/confluence/i, "Confluence"],
  [/power ?bi/i, "Power BI"],
  [/looker/i, "Looker"],
  [/tableau/i, "Tableau"],
  [/\btms\b/i, "TMS"],
  [/\bwms\b/i, "WMS"],
  [/\berp\b/i, "ERP"],
  [/linkedin/i, "LinkedIn"],
  [/docusign/i, "DocuSign"],
  [/google docs|\bword\b|\bdocs\b/i, "Docs"],
  [/slides|powerpoint|deck/i, "Slides"],
  [/chatgpt|copilot|claude|gemini/i, "AI assistant"],
  [/phone|calls?\b/i, "Phone"],
  [/portal/i, "Portals"],
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
  if (/\bper (month|mo)\b|a month|each month|monthly|month[- ]end/.test(t)) hours = hours / WEEKS_PER_MONTH;
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

export type Step = "intro" | "tasks" | "hours" | "hoursProbe" | "pain" | "painProbe" | "waits" | "aiToday" | "human" | "rating" | "review";

export interface RunnerState {
  step: Step;
  taskIndex: number;
  interview: Interview;
}

const firstName = (name: string) => name.split(" ")[0];
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function promptFor(state: RunnerState, company: string): string {
  const { interview: iv, taskIndex } = state;
  const task = iv.tasks[taskIndex]?.name;
  switch (state.step) {
    case "intro":
      return `Hi ${firstName(iv.name)}, I'm the Fieldwork Agent. ${company} asked me to learn how work really gets done, so they can bring in AI where it helps you and leave alone what shouldn't change. It takes about 8 minutes and you can answer the way you'd talk. To start: what's your role, and what does a normal week look like?`;
    case "tasks":
      return "Which tasks do you repeat every week? List up to five, one per line.";
    case "hours":
      return `About how long does “${task}” take you in a typical week, and which tools do you use for it?`;
    case "hoursProbe":
      return `Roughly: an hour, half a day, or a full day a week on “${task}”?`;
    case "pain":
      return `What makes “${task}” slow or frustrating?`;
    case "painProbe":
      return "Can you walk me through the last time that happened?";
    case "waits":
      return "Where does your work wait on someone or something else?";
    case "aiToday":
      return "Do you use any AI tools today, even informally? For what?";
    case "human":
      return "Which part of your job should stay human, no matter how good AI gets?";
    case "rating":
      return "Last one: how was this conversation, from 1 to 5?";
    case "review":
      return "Thank you. Here's what I understood. Fix anything that's off, then submit.";
  }
}

const uid = () => Math.random().toString(36).slice(2, 8);

export function answer(state: RunnerState, text: string): RunnerState {
  const iv = { ...state.interview, tasks: [...state.interview.tasks] };
  const to = (step: Step, taskIndex = state.taskIndex): RunnerState => ({ step, taskIndex, interview: iv });
  const task = iv.tasks[state.taskIndex];
  const nextTask = () => (state.taskIndex + 1 < iv.tasks.length ? to("hours", state.taskIndex + 1) : to("waits"));

  switch (state.step) {
    case "intro":
      iv.context = text;
      return to("tasks");
    case "tasks": {
      const names = parseTaskList(text);
      if (!names.length) return to("tasks");
      iv.tasks = names.map((name) => ({ id: `t-${uid()}`, name, hoursPerWeek: 0, tools: [], pain: "", process: classifyTask(name) }));
      return to("hours", 0);
    }
    case "hours":
    case "hoursProbe": {
      const hours = parseHours(text);
      const tools = parseTools(text);
      iv.tasks[state.taskIndex] = { ...task, hoursPerWeek: hours ?? task.hoursPerWeek, tools: tools.length ? tools : task.tools };
      if (hours == null && state.step === "hours") return to("hoursProbe");
      return to("pain");
    }
    case "pain": {
      const process = task.process === OTHER ? classifyTask(`${task.name} ${text}`) : task.process;
      const tools = [...new Set([...task.tools, ...parseTools(text)])];
      iv.tasks[state.taskIndex] = { ...task, pain: text, process, tools };
      return words(text) < 7 ? to("painProbe") : nextTask();
    }
    case "painProbe": {
      const pain = `${task.pain} ${text}`.trim();
      const process = task.process === OTHER ? classifyTask(`${task.name} ${pain}`) : task.process;
      iv.tasks[state.taskIndex] = { ...task, pain, process, tools: [...new Set([...task.tools, ...parseTools(text)])] };
      return nextTask();
    }
    case "waits":
      iv.waits = text;
      return to("aiToday");
    case "aiToday":
      iv.aiToday = text;
      return to("human");
    case "human":
      iv.keepHuman = text;
      return to("rating");
    case "rating": {
      const n = Number(text.match(/[1-5]/)?.[0]);
      iv.satisfaction = Number.isFinite(n) ? n : null;
      return to("review");
    }
    case "review":
      return state;
  }
}

/** Resumes a partly-answered interview from its transcript. */
export function replay(interview: Interview): RunnerState {
  const answers = interview.transcript.filter((m) => m.from === "person").map((m) => m.text);
  let state: RunnerState = {
    step: "intro",
    taskIndex: 0,
    interview: { ...interview, tasks: [], context: "", waits: "", aiToday: "", keepHuman: "", satisfaction: null },
  };
  for (const a of answers) state = answer(state, a);
  return state;
}

/** Jev's process label when it was confident, otherwise the keyword rule. */
export const effectiveProcess = (t: Interview["tasks"][number]) => (t.judgment?.applied ? t.judgment.label : t.process);

/** The same questions as plain text, for running an interview live on a call. */
export function interviewGuide(company: string): string {
  return [
    `${company}: work discovery interview`,
    "",
    "1. What's your role, and what does a normal week look like?",
    "2. Which tasks do you repeat every week? (up to five)",
    "3. For each task: about how long does it take in a typical week, and which tools do you use?",
    "4. For each task: what makes it slow or frustrating? Ask for the last time it happened.",
    "5. Where does your work wait on someone or something else?",
    "6. Do you use any AI tools today, even informally? For what?",
    "7. Which part of your job should stay human, no matter how good AI gets?",
    "",
    "Write down exact quotes. Type the answers into Fieldwork so they count in the roadmap.",
  ].join("\n");
}

export interface DiscoveryStats {
  invited: number;
  completed: number;
  completionRate: number;
  teams: number;
  taskCount: number;
  hoursPerMonth: number;
  usingAi: number;
  avgSatisfaction: number | null;
  days: number | null;
}

export function discoveryStats(interviews: Interview[]): DiscoveryStats {
  const done = interviews.filter((i) => i.status === "completed");
  const rated = done.filter((i) => i.satisfaction != null);
  const times = done.flatMap((i) => [i.invitedAt, i.completedAt ?? i.invitedAt]).map((d) => new Date(d).getTime());
  return {
    invited: interviews.length,
    completed: done.length,
    completionRate: interviews.length ? Math.round((done.length / interviews.length) * 100) : 0,
    teams: new Set(done.map((i) => i.team)).size,
    taskCount: done.reduce((n, i) => n + i.tasks.length, 0),
    hoursPerMonth: Math.round(done.reduce((n, i) => n + i.tasks.reduce((m, t) => m + t.hoursPerWeek, 0), 0) * WEEKS_PER_MONTH),
    usingAi: done.filter((i) => i.aiToday && !/^\s*(no|nope|not really|none|never)\b/i.test(i.aiToday)).length,
    avgSatisfaction: rated.length ? Math.round((rated.reduce((n, i) => n + (i.satisfaction ?? 0), 0) / rated.length) * 10) / 10 : null,
    days: times.length ? Math.max(1, Math.ceil((Math.max(...times) - Math.min(...times)) / 86_400_000)) : null,
  };
}
