import { buildOpportunities, defaultRoi } from "../src/lib/engine/opportunities";
import { buildEmployeeProfile } from "../src/lib/personal/profile";
import { simulatedFollowup } from "../src/lib/seed-followup";
import { seedInterviews, seedWorkspace } from "../src/lib/seed-interviews";

const problems: string[] = [];
const check = (condition: unknown, message: string) => { if (!condition) problems.push(message); };
const duplicates = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);

const roster = seedWorkspace.teamRoster ?? [];
const population = Number(seedWorkspace.employees.match(/[\d,]+/)?.[0].replaceAll(",", ""));
check(roster.reduce((sum, team) => sum + team.employees, 0) === population, "Team roster must add up to the company population.");
check(!duplicates(roster.map((team) => team.team)).length, "Team names must be unique in the roster.");
check(!duplicates(seedInterviews.map((interview) => interview.id)).length, "Interview IDs must be unique.");
check(!duplicates(seedInterviews.map((interview) => interview.name)).length, "Employee names must be unique.");

const completed = seedInterviews.filter((interview) => interview.status === "completed");
for (const interview of seedInterviews) {
  check(roster.some((team) => team.team === interview.team), `${interview.name} uses a team missing from the roster.`);
  if (interview.status !== "completed") continue;
  check(Boolean(interview.completedAt), `${interview.name} is completed without a completion date.`);
  check(interview.consent?.status === "accepted", `${interview.name} is completed without recorded consent.`);
  check(Boolean(interview.context.trim()), `${interview.name} is missing role context.`);
  check(interview.tasks.length > 0, `${interview.name} has no recurring tasks.`);
  check(Boolean(interview.waits.trim()), `${interview.name} is missing dependency evidence.`);
  check(Boolean(interview.aiToday.trim()), `${interview.name} is missing current AI usage.`);
  check(Boolean(interview.keepHuman.trim()), `${interview.name} is missing a human boundary.`);
  check(interview.satisfaction !== null, `${interview.name} is missing an interview rating.`);
  check(interview.tasks.reduce((sum, task) => sum + task.hoursPerWeek, 0) <= 60, `${interview.name} reports more than 60 recurring hours per week.`);
  check(!duplicates(interview.tasks.map((task) => task.id)).length, `${interview.name} has duplicate task IDs.`);
  for (const task of interview.tasks) {
    check(task.hoursPerWeek > 0 && task.hoursPerWeek <= 40, `${interview.name}: “${task.name}” has an implausible weekly time estimate.`);
    check(Boolean(task.pain.trim()), `${interview.name}: “${task.name}” has no friction evidence.`);
    check(Boolean(task.process.trim()), `${interview.name}: “${task.name}” has no process classification.`);
  }
}

const opportunities = buildOpportunities(seedInterviews, defaultRoi, null, {});
const opportunityIds = new Set(opportunities.map((opportunity) => opportunity.id));
const followup = simulatedFollowup("2026-10-10T12:00:00Z");
for (const initiative of followup) {
  check(opportunityIds.has(initiative.opportunityId), `${initiative.name} does not link to a current opportunity.`);
  check(initiative.activePeople <= initiative.peopleCovered, `${initiative.name} has more active people than covered people.`);
  check(initiative.reports.every((report, index) => report.month === index + 1), `${initiative.name} follow-up months must be consecutive.`);
  check(initiative.teams.every((team) => roster.some((row) => row.team === team)), `${initiative.name} uses an unknown team.`);
}

for (const employee of completed) {
  const profile = buildEmployeeProfile(employee, seedWorkspace, seedInterviews, opportunities, defaultRoi);
  check(profile.opportunities.length > 0, `${employee.name} has no personal opportunity mapping.`);
  check(Boolean(profile.primary), `${employee.name} has no recommended starting point.`);
  check(profile.roadmap.length === 3, `${employee.name} does not have a complete 90-day roadmap.`);
  check(profile.report.taskCount === employee.tasks.length, `${employee.name} report task count is inconsistent.`);
}

if (problems.length) {
  console.error(`check-demo-data: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exit(1);
}

console.log(`check-demo-data: ${completed.length} employees · ${opportunities.length} opportunities · ${followup.length} tracked initiatives · all consistent`);
