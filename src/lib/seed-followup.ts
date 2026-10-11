import { helperInitiative } from "./engine/roi";
import type { PersonalHelper } from "./personal/types";
import type { Interview, RoiAssumptions, TrackedInitiative, Workspace } from "./types";

export const FOLLOWUP_LABEL = "Demo · simulated 90-day follow-up";

/**
 * Northwind Freight, 90 days after the roadmap: the 3 quick wins and 2 "build next" initiatives are live.
 * Linked by opportunity slug so tracking survives re-running the analysis. Tuned against the rule-based
 * forecast at default assumptions so each decision appears:
 *   reporting-dashboards        245 h vs 210 predicted, 78% adoption        → Scale
 *   data-entry-system-updates   135 h vs 178 predicted (76%)               → On track
 *   status-updates-follow-ups   31% adoption, people went back to manual    → Fix
 *   customer-replies-faqs       140 h vs 87 predicted at month 2            → Scale
 *   inbox-ticket-triage         6 h × $55 = $330 < $400 agent run cost      → Stop
 */
const seed: (Omit<TrackedInitiative, "liveSince" | "source"> & { daysLive: number })[] = [
  {
    id: "live-reporting-dashboards",
    opportunityId: "reporting-dashboards",
    name: "Reporting & dashboards",
    teams: ["Finance", "Customer Support", "Operations", "Sales"],
    solution: "automation",
    status: "production",
    daysLive: 88,
    buildCost: 2400,
    monthlyRunCost: 50,
    peopleCovered: 40,
    activePeople: 31,
    reports: [
      { month: 1, hoursReported: 70, usefulRate: 0.78, reports: 9 },
      { month: 2, hoursReported: 150, usefulRate: 0.83, reports: 14 },
      { month: 3, hoursReported: 245, usefulRate: 0.86, reports: 18 },
    ],
  },
  {
    id: "live-data-entry-system-updates",
    opportunityId: "data-entry-system-updates",
    name: "Data entry & system updates",
    teams: ["Customer Support", "Operations"],
    solution: "automation",
    status: "production",
    daysLive: 86,
    buildCost: 2100,
    monthlyRunCost: 50,
    peopleCovered: 30,
    activePeople: 19,
    reports: [
      { month: 1, hoursReported: 45, usefulRate: 0.7, reports: 7 },
      { month: 2, hoursReported: 95, usefulRate: 0.72, reports: 11 },
      { month: 3, hoursReported: 135, usefulRate: 0.74, reports: 13 },
    ],
  },
  {
    id: "live-status-updates-follow-ups",
    opportunityId: "status-updates-follow-ups",
    name: "Status updates & follow-ups",
    teams: ["Finance", "Operations"],
    solution: "automation",
    status: "pilot",
    daysLive: 87,
    buildCost: 1100,
    monthlyRunCost: 50,
    peopleCovered: 35,
    activePeople: 11,
    reports: [
      { month: 1, hoursReported: 40, usefulRate: 0.7, reports: 8 },
      { month: 2, hoursReported: 38, usefulRate: 0.69, reports: 6 },
      { month: 3, hoursReported: 30, usefulRate: 0.68, reports: 5 },
    ],
  },
  {
    id: "live-customer-replies-faqs",
    opportunityId: "customer-replies-faqs",
    name: "Customer replies & FAQs",
    teams: ["Customer Support"],
    solution: "skill",
    status: "pilot",
    daysLive: 63,
    buildCost: 1200,
    monthlyRunCost: 1800,
    peopleCovered: 60,
    activePeople: 46,
    reports: [
      { month: 1, hoursReported: 50, usefulRate: 0.76, reports: 12 },
      { month: 2, hoursReported: 140, usefulRate: 0.81, reports: 21 },
    ],
  },
  {
    id: "live-inbox-ticket-triage",
    opportunityId: "inbox-ticket-triage",
    name: "Inbox & ticket triage",
    teams: ["Customer Support", "Sales", "IT"],
    solution: "agent",
    status: "pilot",
    daysLive: 65,
    buildCost: 2600,
    monthlyRunCost: 400,
    peopleCovered: 25,
    activePeople: 15,
    reports: [
      { month: 1, hoursReported: 14, usefulRate: 0.64, reports: 9 },
      { month: 2, hoursReported: 6, usefulRate: 0.62, reports: 7 },
    ],
  },
];

/** The simulated follow-up, dated relative to `asOf` so the 30/60-day rules don't drift. */
export function simulatedFollowup(asOf: Date | string): TrackedInitiative[] {
  const at = new Date(asOf).getTime();
  return seed.map(({ daysLive, ...init }) => ({
    ...init,
    source: "simulated",
    liveSince: new Date(at - daysLive * 86_400_000).toISOString(),
  }));
}

/** Live initiatives to track: the simulated seed only for synthetic workspaces, plus real My work feedback. */
export function followupInitiatives(p: {
  workspace: Workspace;
  helpers: PersonalHelper[];
  interviews: Interview[];
  roi: RoiAssumptions;
  asOf: Date | string;
}): TrackedInitiative[] {
  const helper = helperInitiative(p.helpers, p.interviews, p.roi, p.asOf);
  return [...(p.workspace.synthetic ? simulatedFollowup(p.asOf) : []), ...(helper ? [helper] : [])];
}
