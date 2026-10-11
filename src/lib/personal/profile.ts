import { WEEKS_PER_MONTH } from "../engine/interview";
import { money, phaseMeta } from "../engine/opportunities";
import { blueprint, processByName, solutionMeta } from "../engine/processes";
import { interviewQuality } from "../engine/research-graph";
import type { Interview, Opportunity, Phase, RoiAssumptions, Solution, Workspace } from "../types";

export interface PersonalOpportunity {
  id: string;
  process: string;
  solution: Solution;
  phase: Phase;
  phaseLabel: string;
  window: string;
  taskIds: string[];
  taskNames: string[];
  hoursPerWeek: number;
  capacityHoursPerMonth: number;
  capacityValuePerYear: number;
  priority: number;
  headline: string;
  action: string;
  checkpoint: string;
  metric: string;
  evidence: string[];
}

export interface PersonalRoadmapStage {
  id: "start" | "practice" | "scale";
  label: string;
  window: string;
  title: string;
  detail: string;
  outcome: string;
}

export interface EmployeeProfile {
  employee: Interview;
  company: {
    name: string;
    industry: string;
    employees: string;
    teamSize: number | null;
    teamSample: number;
    sampleTotal: number;
    priorities: string[];
  };
  report: {
    totalHoursPerWeek: number;
    totalHoursPerMonth: number;
    taskCount: number;
    tools: string[];
    quality: number;
    currentAi: string;
    dependencies: string;
    humanBoundary: string;
  };
  opportunities: PersonalOpportunity[];
  primary: PersonalOpportunity | null;
  roadmap: PersonalRoadmapStage[];
  estimatedCapacityPerMonth: number;
  estimatedValuePerYear: number;
}

const humanAction = (process: string) => `Use AI to prepare context for ${process.toLowerCase()}, while you keep the decision and relationship.`;

function actionFor(solution: Solution, process: string, task: string) {
  if (solution === "human") return humanAction(process);
  if (solution === "automation") return `Pilot a repeatable flow for “${task}” and route exceptions back to you.`;
  if (solution === "agent") return `Pilot a bounded agent for “${task}” with an approval checkpoint before it acts.`;
  return `Build a reusable AI helper for “${task}” that drafts the work for you to review.`;
}

export function buildEmployeeProfile(
  employee: Interview,
  workspace: Workspace,
  interviews: Interview[],
  opportunities: Opportunity[],
  roi: RoiAssumptions,
): EmployeeProfile {
  const taskIds = new Set(employee.tasks.map((task) => task.id));
  const employeeOpportunities = opportunities
    .map((opportunity): PersonalOpportunity | null => {
      const tasks = opportunity.tasks.filter((task) => task.person === employee.name && taskIds.has(task.id));
      if (!tasks.length) return null;
      const hoursPerWeek = tasks.reduce((sum, task) => sum + task.hoursPerWeek, 0);
      const adoption = roi.adoptionCeilings[Math.max(0, Math.min(4, opportunity.scores.adoption - 1))];
      const capacityHoursPerMonth = opportunity.solution === "human" ? 0 : hoursPerWeek * WEEKS_PER_MONTH * roi.capture[opportunity.solution] * adoption;
      const process = processByName(opportunity.process);
      const plan = blueprint(process ?? {
        name: opportunity.process,
        re: /$^/,
        description: opportunity.description,
        solution: opportunity.solution,
        scores: opportunity.scores,
        trigger: "the work starts",
        inputs: "the employee's approved context",
        output: "a draft for review",
        checkpoint: "the work requires judgment",
        metric: "Time spent on the task",
      }, opportunity.solution, opportunity.tools, [employee.team]);
      return {
        id: opportunity.id,
        process: opportunity.process,
        solution: opportunity.solution,
        phase: opportunity.phase,
        phaseLabel: phaseMeta[opportunity.phase].label,
        window: phaseMeta[opportunity.phase].window,
        taskIds: tasks.map((task) => task.id),
        taskNames: tasks.map((task) => task.name),
        hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
        capacityHoursPerMonth: Math.round(capacityHoursPerMonth),
        capacityValuePerYear: Math.round(capacityHoursPerMonth * roi.hourlyCost * 12),
        priority: opportunity.priority,
        headline: plan.headline,
        action: actionFor(opportunity.solution, opportunity.process, tasks[0].name),
        checkpoint: opportunity.solution === "human" ? employee.keepHuman || plan.checkpoint : plan.checkpoint,
        metric: plan.metric,
        evidence: tasks.map((task) => task.pain || task.name),
      };
    })
    .filter((item): item is PersonalOpportunity => Boolean(item))
    .sort((a, b) => {
      const phaseOrder: Record<Phase, number> = { now: 0, next: 1, later: 2, keep: 3 };
      return phaseOrder[a.phase] - phaseOrder[b.phase] || b.priority - a.priority || b.hoursPerWeek - a.hoursPerWeek;
    });

  const primary = employeeOpportunities.find((item) => item.solution !== "human") ?? employeeOpportunities[0] ?? null;
  const completed = interviews.filter((interview) => interview.status === "completed");
  const teamRoster = workspace.teamRoster?.find((team) => team.team === employee.team)?.employees ?? null;
  const teamSample = completed.filter((interview) => interview.team === employee.team).length;
  const totalHoursPerWeek = employee.tasks.reduce((sum, task) => sum + task.hoursPerWeek, 0);
  const estimatedCapacityPerMonth = employeeOpportunities.reduce((sum, item) => sum + item.capacityHoursPerMonth, 0);
  const estimatedValuePerYear = employeeOpportunities.reduce((sum, item) => sum + item.capacityValuePerYear, 0);
  const primaryTitle = primary?.taskNames[0] ?? "your highest-friction recurring task";
  const primaryMetric = primary?.metric ?? "Time spent on the task";

  return {
    employee,
    company: {
      name: workspace.company,
      industry: workspace.industry,
      employees: workspace.employees,
      teamSize: teamRoster,
      teamSample,
      sampleTotal: completed.length,
      priorities: opportunities.filter((item) => item.solution !== "human").slice(0, 3).map((item) => item.process),
    },
    report: {
      totalHoursPerWeek: Math.round(totalHoursPerWeek * 10) / 10,
      totalHoursPerMonth: Math.round(totalHoursPerWeek * WEEKS_PER_MONTH),
      taskCount: employee.tasks.length,
      tools: [...new Set(employee.tasks.flatMap((task) => task.tools))],
      quality: interviewQuality(employee).score,
      currentAi: employee.aiToday || "No current AI use was recorded.",
      dependencies: employee.waits || "No dependency was recorded.",
      humanBoundary: employee.keepHuman || "Final judgment and approval stay with the employee.",
    },
    opportunities: employeeOpportunities,
    primary,
    roadmap: [
      {
        id: "start",
        label: "Start",
        window: "Weeks 1–2",
        title: primary ? `Build the first helper for ${primaryTitle.toLowerCase()}` : "Confirm the first useful task",
        detail: primary?.action ?? "Review the interview and choose one recurring task with a clear input and output.",
        outcome: `Baseline: ${primary?.hoursPerWeek ?? totalHoursPerWeek} h/week today.`,
      },
      {
        id: "practice",
        label: "Practice",
        window: "Weeks 3–6",
        title: "Run it on real work and correct it",
        detail: `Keep examples, mark what was useful, and stop the helper at the human checkpoint: ${(primary?.checkpoint ?? (employee.keepHuman || "final approval")).replace(/[.]+$/, "")}.`,
        outcome: `Measure ${primaryMetric.toLowerCase()}.`,
      },
      {
        id: "scale",
        label: "Scale",
        window: "Weeks 7–12",
        title: "Connect the approved workflow",
        detail: primary?.solution === "automation"
          ? "Connect the trigger and destination only after the manual pilot is reliable."
          : primary?.solution === "agent"
            ? "Add one approved tool at a time and keep an audit trail for every action."
            : "Save the instructions, approved context, and examples as a reusable team skill.",
        outcome: estimatedCapacityPerMonth ? `Target up to ${estimatedCapacityPerMonth} hours of capacity per month (${money(estimatedValuePerYear)}/year at loaded cost).` : "Protect the human-owned decision while reducing preparation work.",
      },
    ],
    estimatedCapacityPerMonth,
    estimatedValuePerYear,
  };
}

export function employeeReportMarkdown(profile: EmployeeProfile) {
  const { employee, report, company } = profile;
  const lines = [
    `# ${employee.name}: personal AI work report`,
    "",
    `${employee.role} · ${employee.team} · ${company.name}`,
    "",
    `Built from this employee's completed interview and the company opportunity map. Interview evidence quality: ${report.quality}/100.`,
    "",
    "## Work today",
    "",
    `- ${report.taskCount} recurring tasks · ${report.totalHoursPerWeek} hours/week (${report.totalHoursPerMonth} hours/month)`,
    `- Tools: ${report.tools.join(", ") || "None recorded"}`,
    `- Dependencies: ${report.dependencies}`,
    `- AI today: ${report.currentAi}`,
    `- Keep human: ${report.humanBoundary}`,
    "",
    "## Personalized opportunities",
    "",
    ...profile.opportunities.flatMap((item) => [
      `### ${item.process}`,
      "",
      `- Recommendation: ${solutionMeta[item.solution].label}`,
      `- Timing: ${item.phaseLabel} · ${item.window}`,
      `- Employee work: ${item.taskNames.join(", ")} · ${item.hoursPerWeek} h/week`,
      `- Action: ${item.action}`,
      `- Human checkpoint: ${item.checkpoint}`,
      `- Measure: ${item.metric}`,
      `- Estimated capacity: ${item.capacityHoursPerMonth} h/month · ${money(item.capacityValuePerYear)}/year at loaded cost`,
      "",
    ]),
    "## 90-day roadmap",
    "",
    ...profile.roadmap.flatMap((stage, index) => [
      `${index + 1}. **${stage.label} (${stage.window}) — ${stage.title}**`,
      `   ${stage.detail} ${stage.outcome}`,
    ]),
    "",
    "Capacity is an estimate from reported hours, solution capture, and adoption assumptions. It is not guaranteed cash savings.",
  ];
  return lines.join("\n");
}
