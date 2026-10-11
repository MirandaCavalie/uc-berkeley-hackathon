import type { Interview, TeamPopulation, Workspace } from "../types";

/**
 * A practical discovery sample: 95% confidence with roughly ±10% precision,
 * using the conservative finite-population approximation. It is a starting
 * point for discovery, not a claim that every employee must be interviewed.
 */
export const SAMPLE_POLICY = {
  marginOfError: 0.1,
  minimumPerTeam: 3,
  interviewMinutes: 8,
} as const;

export interface TeamSampleTarget extends TeamPopulation {
  target: number;
  completed: number;
  invited: number;
  remaining: number;
}

export interface SamplePlan {
  population: number;
  target: number;
  completed: number;
  invited: number;
  remaining: number;
  estimatedMinutes: number;
  estimatedHours: number;
  estimatedCost: number;
  teams: TeamSampleTarget[];
}

const employeeCount = (value: string) => Number(value.match(/[\d,]+/)?.[0]?.replace(/,/g, "") ?? 0);

function rosterFor(workspace: Workspace, interviews: Interview[]): TeamPopulation[] {
  const configured = workspace.teamRoster?.filter((team) => team.employees > 0) ?? [];
  if (configured.length) return configured;

  const inferred = new Map<string, number>();
  for (const interview of interviews) inferred.set(interview.team, (inferred.get(interview.team) ?? 0) + 1);
  const population = employeeCount(workspace.employees);
  if (!inferred.size) return [{ team: "All teams", employees: Math.max(population, 1) }];

  const people = [...inferred.values()].reduce((sum, count) => sum + count, 0);
  return [...inferred.entries()].map(([team, count]) => ({
    team,
    employees: Math.max(count, Math.round((population * count) / Math.max(people, 1))),
  }));
}

function sampleSize(population: number) {
  if (population <= 0) return 0;
  const raw = Math.ceil(population / (1 + population * SAMPLE_POLICY.marginOfError ** 2));
  return Math.min(population, Math.max(raw, SAMPLE_POLICY.minimumPerTeam));
}

function allocateTargets(roster: TeamPopulation[], target: number) {
  const total = roster.reduce((sum, team) => sum + team.employees, 0);
  const minimums = roster.map((team) => (team.employees > 0 ? Math.min(SAMPLE_POLICY.minimumPerTeam, team.employees) : 0));
  const minimumTotal = minimums.reduce((sum, value) => sum + value, 0);
  const targetTotal = Math.max(target, minimumTotal);
  const raw = roster.map((team) => (total ? (targetTotal * team.employees) / total : 0));
  const allocations = raw.map((value, index) => Math.max(minimums[index], Math.floor(value)));
  let remainder = Math.max(0, targetTotal - allocations.reduce((sum, value) => sum + value, 0));

  [...raw.keys()]
    .sort((a, b) => raw[b] - Math.floor(raw[b]) - (raw[a] - Math.floor(raw[a])))
    .forEach((index) => {
      if (remainder > 0 && allocations[index] < roster[index].employees) {
        allocations[index] += 1;
        remainder -= 1;
      }
    });

  return allocations;
}

export function buildSamplePlan(workspace: Workspace, interviews: Interview[], hourlyCost = 55): SamplePlan {
  const roster = rosterFor(workspace, interviews);
  const population = roster.reduce((sum, team) => sum + team.employees, 0);
  const target = sampleSize(population);
  const allocations = allocateTargets(roster, target);
  const teams = roster.map((team, index) => {
    const people = interviews.filter((interview) => interview.team === team.team);
    const completed = people.filter((interview) => interview.status === "completed").length;
    return {
      ...team,
      target: allocations[index],
      completed,
      invited: people.length,
      remaining: Math.max(0, allocations[index] - completed),
    };
  });
  const completed = teams.reduce((sum, team) => sum + team.completed, 0);
  const invited = teams.reduce((sum, team) => sum + team.invited, 0);
  const estimatedMinutes = target * SAMPLE_POLICY.interviewMinutes;

  return {
    population,
    target: teams.reduce((sum, team) => sum + team.target, 0),
    completed,
    invited,
    remaining: Math.max(0, teams.reduce((sum, team) => sum + team.target, 0) - completed),
    estimatedMinutes,
    estimatedHours: Math.round((estimatedMinutes / 60) * 10) / 10,
    estimatedCost: Math.round((estimatedMinutes / 60) * hourlyCost),
    teams,
  };
}

export function sampleBrief(company: string, plan: SamplePlan) {
  return [
    `Fieldwork interview plan · ${company}`,
    `Target ${plan.target} interviews across ${plan.teams.length} teams from a population of ${plan.population}.`,
    `Each interview takes about ${SAMPLE_POLICY.interviewMinutes} minutes and asks about recurring work, time, tools, friction, handoffs, AI use, and human judgment.`,
    "",
    ...plan.teams.map((team) => `${team.team}: invite ${team.target} people (${team.completed} complete, ${team.remaining} remaining)`),
  ].join("\n");
}
