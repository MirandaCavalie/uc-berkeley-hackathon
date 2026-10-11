import type { Interview, Workspace } from "../types";
import type { HelperConfig, Meeting, MeetingBrief, PersonalHelper } from "./types";

export function recommendedTask(interview: Interview) {
  return interview.tasks.find((task) => /meeting|call|prospect|client|brief|coordina|report/i.test(task.name)) ?? interview.tasks[0];
}

export function sampleMeeting(): Meeting {
  return {
    id: "sample-planning",
    title: "Project planning conversation",
    start: "2026-10-12T10:00:00-07:00",
    attendees: ["Project lead", "Account team"],
    description: "Discuss the next phase of a sample client project. Confirm the scope, open questions, and next steps.",
    source: "sample",
  };
}

export function initialConfig(interview: Interview, workspace: Workspace): HelperConfig {
  const task = recommendedTask(interview);
  return {
    name: "Prepare my meeting",
    taskId: task?.id ?? "",
    goal: task ? `Prepare for a conversation about ${task.name.toLowerCase()}.` : "Understand the meeting purpose and prepare useful questions.",
    instructions: "Keep the brief concise. Separate supplied facts from suggested questions. Flag missing information. Leave decisions and commitments to me.",
    companyContext: [workspace.company, workspace.industry].filter(Boolean).join(" · "),
    sections: ["agenda", "questions", "checklist"],
    source: "sample",
    meeting: sampleMeeting(),
    notes: "",
  };
}

/** Editing any input invalidates the test, including corrections to an interview. */
export function inputFingerprint(config: HelperConfig, interview: Interview, workspace: Workspace): string {
  return JSON.stringify({ config, interview, workspace });
}

export function validateConfig(config: HelperConfig, step: number): string | null {
  if (!config.goal.trim()) return "Describe what you want to achieve before continuing.";
  if (step >= 1 && (!config.instructions.trim() || !config.sections.length)) return "Add instructions and select at least one section.";
  if (step >= 2 && !config.meeting.title.trim()) return "Select a meeting or enter its title.";
  if (step >= 2 && config.source !== config.meeting.source) return "Choose a meeting from the selected source.";
  if (step >= 4 && !config.name.trim()) return "Give your helper a name.";
  return null;
}

/** A useful, explicitly labelled worksheet when an AI provider is not configured. */
export function templateBrief(config: HelperConfig, interview: Pick<Interview, "role" | "keepHuman">): MeetingBrief {
  return {
    summary: `Preparation worksheet for “${config.meeting.title}”. Your goal: ${config.goal.trim()}`,
    agenda: config.sections.includes("agenda") ? [
      `Confirm the desired outcome: ${config.goal.trim()}`,
      "Review the supplied background and identify the decisions needed.",
      "Agree next steps, owners, and dates during the meeting.",
    ] : [],
    questions: config.sections.includes("questions") ? [
      `As ${interview.role || "a participant"}, what information do I need to contribute?`,
      "Which assumptions or open questions should we resolve together?",
      "Who needs to be involved before a commitment can be made?",
    ] : [],
    checklist: config.sections.includes("checklist") ? [
      ...(config.meeting.description.trim() ? ["Review the selected meeting description in Sources."] : []),
      ...(config.notes.trim() ? ["Review the background notes you supplied in Sources."] : []),
      "Check this worksheet against your instructions before using it.",
      ...(interview.keepHuman ? [`Keep your judgment in charge: ${interview.keepHuman}`] : ["Review all commitments yourself."]),
    ] : [],
    unknowns: [
      ...(!config.meeting.attendees.length ? ["Attendees have not been supplied."] : []),
      ...(!config.notes.trim() ? ["No background notes were supplied. Previous decisions and commitments are unknown."] : []),
      "No meeting outcome or follow-up action has been inferred. Add notes after the meeting before drafting follow-ups.",
    ],
  };
}

export function progressFor(helpers: PersonalHelper[]) {
  const runs = helpers.flatMap((helper) => helper.runs);
  const reported = runs.filter((run) => run.minutesSaved !== undefined);
  return {
    runs: runs.length,
    useful: runs.filter((run) => run.feedback === "useful").length,
    reports: reported.length,
    minutes: reported.reduce((sum, run) => sum + (run.minutesSaved ?? 0), 0),
  };
}

export function briefMarkdown(config: HelperConfig, run: { brief: MeetingBrief; mode: string }): string {
  const b = run.brief;
  return [`# ${config.meeting.title}`, `${run.mode === "ai" ? "AI draft" : "Template worksheet"} · ${config.meeting.source} meeting`, "", b.summary,
    ...([ ["Suggested agenda", b.agenda], ["Questions to consider", b.questions], ["Preparation checklist", b.checklist], ["Unknowns", b.unknowns] ] as const)
      .flatMap(([title, items]) => items.length ? ["", `## ${title}`, ...items.map((item) => `- ${item}`)] : []),
  ].join("\n");
}
