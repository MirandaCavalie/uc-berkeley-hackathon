import type { Interview, InterviewTask, Solution, Workspace } from "../types";
import type { PersonalOpportunity } from "./profile";
import type { PersonalHelper } from "./types";

export interface AppDef {
  id: string;
  name: string;
  color: string;
  triggers: string[];
  actions: string[];
}

export const MANUAL_APP = "manual";
export const SCHEDULE_APP = "schedule";
export const CALENDAR_APP = "google-calendar";

const catalog: { match: RegExp; triggers: string[]; actions: string[] }[] = [
  { match: /gmail|outlook|e-?mail|inbox/i, triggers: ["New email arrives", "Email from a vendor or customer"], actions: ["Save as a draft reply", "Send it to me"] },
  { match: /zendesk|ticket|help ?desk/i, triggers: ["New ticket", "Ticket waiting on us"], actions: ["Draft a reply on the ticket", "Add an internal note"] },
  { match: /slack|teams/i, triggers: ["New message in a channel", "Someone mentions me"], actions: ["Post to a channel", "Send me a direct message"] },
  { match: /excel|sheet/i, triggers: ["New row added", "File updated"], actions: ["Add a row", "Update the report file"] },
  { match: /netsuite|erp|quickbooks/i, triggers: ["New vendor bill", "A record changes"], actions: ["Draft a record for review"] },
  { match: /salesforce|hubspot|crm/i, triggers: ["New lead", "Deal changes stage"], actions: ["Draft a CRM note", "Suggest a field update"] },
  { match: /tms|shipment/i, triggers: ["Shipment status changes", "Shipment is delayed"], actions: ["Add a note to the shipment"] },
  { match: /calendar/i, triggers: ["Meeting starts in 1 hour", "New meeting booked"], actions: ["Add notes to the event"] },
  { match: /power ?bi|tableau|looker/i, triggers: ["Report refreshed"], actions: ["Attach a summary to the report"] },
  { match: /docs|word|notion/i, triggers: ["New document shared with me"], actions: ["Create a draft document"] },
  { match: /phone|call/i, triggers: ["Missed call", "Call ends"], actions: ["Log the call notes"] },
  { match: /bamboo|workday|hr/i, triggers: ["New hire added"], actions: ["Draft the onboarding checklist"] },
  { match: /linkedin/i, triggers: ["New lead saved"], actions: ["Draft a message"] },
];

const palette = ["#4f64d8", "#b87535", "#7161e8", "#1f8a5b", "#bd547b", "#2a8bb5", "#c25b2e", "#5a6b7d"];
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const colorFor = (name: string) => palette[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % palette.length];

export function appFor(name: string): AppDef {
  const known = catalog.find((c) => c.match.test(name));
  return {
    id: slug(name),
    name,
    color: colorFor(name),
    triggers: known?.triggers ?? [`New item in ${name}`],
    actions: known?.actions ?? [`Save a draft in ${name}`],
  };
}

export const builtInApps: AppDef[] = [
  { id: MANUAL_APP, name: "Run it myself", color: "#19182d", triggers: ["When I click Run"], actions: ["Show me the result to copy"] },
  { id: SCHEDULE_APP, name: "Schedule", color: "#77758a", triggers: ["Every weekday at 9am", "Every Monday at 9am", "At month-end"], actions: [] },
];

/** Apps come from the tools the employee named in their interview, plus Google Calendar. */
export function appsFor(employee: Interview): AppDef[] {
  const tools = [...new Set(employee.tasks.flatMap((t) => t.tools).filter(Boolean))];
  if (!tools.some((t) => /calendar/i.test(t))) tools.push("Google Calendar");
  return tools.map((t) => (/^google calendar$/i.test(t) ? { ...appFor(t), id: CALENDAR_APP } : appFor(t)));
}

export function findApp(apps: AppDef[], id: string): AppDef | undefined {
  return [...builtInApps, ...apps].find((a) => a.id === id);
}

export const levels = [
  { label: "Getting started", next: "Try one of the prompts below on real work this week." },
  { label: "Trying it", next: "Turn the prompt that worked into a helper so you never retype it." },
  { label: "Building the habit", next: "Run your helper on real work and mark what was useful." },
  { label: "Confident", next: "Share your best helper with your team and teach one person." },
];

export function aiLevel(employee: Interview, helpers: PersonalHelper[]): number {
  const useful = helpers.flatMap((h) => h.runs).filter((r) => r.feedback === "useful").length;
  if (useful >= 2) return 3;
  if (helpers.length) return 2;
  const today = employee.aiToday.trim();
  if (!today || /^(no|none|never|not yet|i don'?t|we don'?t|haven'?t)\b/i.test(today)) return 0;
  return 1;
}

export interface Lesson {
  task: InterviewTask;
  solution: Solution;
  opportunity?: PersonalOpportunity;
  aiDoes: string;
  youKeep: string;
  tip: string;
  prompt: string;
}

const aiDoes: Record<Solution, string> = {
  skill: "Write the first draft, so you start at 80% instead of a blank page.",
  automation: "Move the same information the same way every time, so you only handle the exceptions.",
  agent: "Work through the queue and come to you only when something looks unusual.",
  human: "Gather and summarize the facts before you decide. The decision stays yours.",
};

const tips: Record<Solution, string> = {
  skill: "Paste one past result you were happy with. AI copies the style and structure far better than it follows a description.",
  automation: "Write the steps exactly as you do them today. That list is the automation; AI only needs to follow it.",
  agent: "Decide up front which cases it must hand back to you. A clear 'stop and ask me' rule is what makes it safe.",
  human: "Ask AI for the facts and the open questions, never for the answer. You bring the judgment and the relationship.",
};

const asks: Record<Solution, string> = {
  skill: "Draft it for me in my usual tone. Keep it short.",
  automation: "Turn this into a step-by-step checklist I can follow the same way every time, and point out which steps never change.",
  agent: "Sort these items into: handle routinely, needs my attention, and missing information. Explain each call in one line.",
  human: "Summarize the facts and list the questions I should answer before I decide. Do not recommend a decision.",
};

export function lessonsFor(employee: Interview, workspace: Workspace, opportunities: PersonalOpportunity[]): Lesson[] {
  return employee.tasks
    .map((task) => {
      const opportunity = opportunities.find((o) => o.taskIds.includes(task.id));
      const solution = opportunity?.solution ?? "skill";
      const youKeep = opportunity?.checkpoint || employee.keepHuman || "The final call and anything you send in your name.";
      return { task, solution, opportunity, aiDoes: aiDoes[solution], youKeep, tip: tips[solution], prompt: promptFor(employee, workspace, task, solution) };
    })
    .sort((a, b) => (b.opportunity?.priority ?? 0) - (a.opportunity?.priority ?? 0) || b.task.hoursPerWeek - a.task.hoursPerWeek);
}

function promptFor(employee: Interview, workspace: Workspace, task: InterviewTask, solution: Solution): string {
  const company = [workspace.company, workspace.industry].filter(Boolean).join(", a company in ");
  return [
    `I'm ${/^[aeiou]/i.test(employee.role) ? "an" : "a"} ${employee.role} on the ${employee.team} team at ${company}.`,
    `I spend about ${task.hoursPerWeek} hours a week on "${task.name}"${task.tools.length ? ` using ${task.tools.join(", ")}` : ""}.`,
    task.pain ? `What makes it slow: ${task.pain}` : "",
    "",
    asks[solution],
    "",
    "Rules:",
    "- Only use the information I give you. If something is missing, ask me.",
    "- Mark anything you are unsure about.",
    `- Don't decide for me${employee.keepHuman ? `. I always handle this myself: ${employee.keepHuman}` : "."}`,
    "",
    "Here is today's example:",
    "[paste it here]",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}
