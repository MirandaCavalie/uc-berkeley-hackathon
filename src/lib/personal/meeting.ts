import type { Interview, Workspace } from "../types";
import type { HelperConfig, Meeting, MeetingBrief, PersonalHelper } from "./types";

export function recommendedTask(interview: Interview) {
  return interview.tasks.find((task) => /meeting|call|prospect|client|brief|coordina|report/i.test(task.name)) ?? interview.tasks[0];
}

export function sampleMeeting(taskName = "Project planning"): Meeting {
  return {
    id: "sample-work-item",
    title: `${taskName} example`,
    start: "2026-10-12T10:00:00-07:00",
    attendees: ["Employee", "Reviewer"],
    description: "A practice work item for testing the helper before adding company context.",
    source: "sample",
  };
}

export function initialConfig(interview: Interview, workspace: Workspace, taskId?: string): HelperConfig {
  const task = interview.tasks.find((item) => item.id === taskId) ?? recommendedTask(interview);
  const taskName = task?.name ?? "Recurring work";
  return {
    name: `${taskName} helper`,
    taskId: task?.id ?? "",
    goal: task ? `Help me complete ${task.name.toLowerCase()} faster and more consistently.` : "Help me prepare a useful work brief.",
    instructions: "Keep the output concise. Separate supplied facts from suggestions. Flag missing information. Never make final decisions or commitments for me.",
    companyContext: [workspace.company, workspace.industry, interview.team, interview.role].filter(Boolean).join(" · "),
    sections: ["agenda", "questions", "checklist"],
    source: "sample",
    meeting: sampleMeeting(taskName),
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
  if (step >= 2 && !config.meeting.title.trim()) return "Select or enter a work item.";
  if (step >= 2 && config.source !== config.meeting.source) return "Choose context from the selected source.";
  if (step >= 4 && !config.name.trim()) return "Give your helper a name.";
  return null;
}

/** A useful, explicitly labelled worksheet when an AI provider is not configured. */
export function templateBrief(config: HelperConfig, interview: Pick<Interview, "role" | "keepHuman">): MeetingBrief {
  return {
    summary: `Work brief for “${config.meeting.title}”. Your goal: ${config.goal.trim()}`,
    agenda: config.sections.includes("agenda") ? [
      `Confirm the desired outcome: ${config.goal.trim()}`,
      "Review the supplied context and identify the work that can be drafted safely.",
      "Complete the draft, then stop at the human checkpoint for review.",
    ] : [],
    questions: config.sections.includes("questions") ? [
      `As ${interview.role || "the employee"}, what information do I need before starting?`,
      "Which assumptions or open questions should we resolve together?",
      "Which decision or commitment must stay with a person?",
    ] : [],
    checklist: config.sections.includes("checklist") ? [
      ...(config.meeting.description.trim() ? ["Review the selected work context in Sources."] : []),
      ...(config.notes.trim() ? ["Review the background notes you supplied in Sources."] : []),
      "Check this worksheet against your instructions before using it.",
      ...(interview.keepHuman ? [`Keep your judgment in charge: ${interview.keepHuman}`] : ["Review all commitments yourself."]),
    ] : [],
    unknowns: [
      ...(!config.meeting.attendees.length ? ["People involved have not been supplied."] : []),
      ...(!config.notes.trim() ? ["No background notes were supplied. Important exceptions may be missing."] : []),
      "No final decision, approval, or external action has been inferred.",
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
  return [`# ${config.meeting.title}`, `${run.mode === "ai" ? "AI draft" : "Template worksheet"} · ${config.meeting.source} context`, "", b.summary,
    ...([ ["Suggested approach", b.agenda], ["Questions to resolve", b.questions], ["Review checklist", b.checklist], ["Unknowns", b.unknowns] ] as const)
      .flatMap(([title, items]) => items.length ? ["", `## ${title}`, ...items.map((item) => `- ${item}`)] : []),
  ].join("\n");
}
