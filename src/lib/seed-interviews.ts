import { answer, promptFor, type RunnerState } from "./engine/interview";
import type { Interview } from "./types";

interface Script {
  name: string;
  role: string;
  team: string;
  invitedAt: string;
  completedAt?: string;
  answers?: string[];
}

const scripts: Script[] = [
  {
    name: "Alex Chen",
    role: "Design Lead",
    team: "Creative",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-05T16:20:00Z",
    answers: [
      "I run the design team on launches and own the creative review rounds.",
      "Consolidating feedback from Slack, email and Figma\nPresenting work in review meetings\nConcept development with the team\nWriting status updates for stakeholders",
      "About 6 hours a week, mostly Slack, email and Figma comments",
      "I reconcile 30+ comments by hand every round and half of them contradict each other.",
      "2 hours a week in Figma",
      "People give feedback live and then change it in Slack an hour later.",
      "Probably 10 hours a week in Figma",
      "Not enough time for it, the loops eat the week.",
      "3 hours a week in Slack and Notion",
      "Copying the same update into Slack, email and Asana.",
      "Usually 3, sometimes 4 on hero assets.",
      "About 4 hours a round, across Slack, email and Figma.",
      "Waiting on Dana and Priya to agree on feedback before we can revise. Approvals stall for days.",
      "The concept and the craft. Choosing the idea is the job.",
      "5",
    ],
  },
  {
    name: "Nina Patel",
    role: "Production Designer",
    team: "Creative",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-06T11:05:00Z",
    answers: [
      "I take the approved hero and produce every channel version.",
      "Resizing master assets into every channel size\nExporting and naming files for the DAM\nApplying last-minute copy changes across all sizes",
      "12 hours a week in Figma and Photoshop",
      "38 sizes per launch and I rebuild most of them by hand.",
      "4 hours a week, Figma and Bynder",
      "Naming conventions change per platform and I fix them manually.",
      "5 hours a week in Figma",
      "One headline change means re-touching every single size.",
      "2 or 3.",
      "An hour, but I wait days for it.",
      "Waiting for final copy and legal sign-off before I can start adaptations.",
      "Art direction decisions on the hero crop.",
      "4",
    ],
  },
  {
    name: "Leo Martins",
    role: "Copywriter",
    team: "Creative",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-06T15:40:00Z",
    answers: [
      "I write the campaign line and all the channel copy.",
      "Writing headline variants for ads\nRewriting copy to fit each channel's character limits\nChecking copy against the claims list",
      "8 hours a week in Google Docs",
      "Writing 20 variants nobody tests is the worst part.",
      "4 hours a week, Docs and Meta Ads",
      "Counting characters for every placement by hand.",
      "3 hours a week in Docs and email",
      "Claims list lives in a PDF and changes every quarter.",
      "3 rounds on the headline alone.",
      "2 hours a round.",
      "Legal review takes 2 to 3 days and comes back as an email thread.",
      "The campaign line and the tone. That's the brand.",
      "5",
    ],
  },
  {
    name: "Sam Whitfield",
    role: "Legal Counsel",
    team: "Legal",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-07T10:15:00Z",
    answers: [
      "I sign off on every claim before it ships.",
      "Reviewing campaign claims\nChecking substantiation documents\nAnswering the same claims questions on Slack",
      "6 hours a week, mostly email",
      "Most claims I flag are the same five words every launch.",
      "3 hours a week in Drive",
      "Hunting for the right certificate in Drive.",
      "2 hours a week in Slack",
      "The same questions come in every launch.",
      "Waiting for final copy, which keeps changing after I approve it.",
      "The final legal call on anything new. That needs a lawyer.",
      "4",
    ],
  },
  {
    name: "Rosa Delgado",
    role: "Marketing Ops",
    team: "Operations",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-07T17:30:00Z",
    answers: [
      "I get approved assets live and keep the launch on schedule.",
      "Uploading assets to ad platforms\nChasing approvals in Asana\nBuilding the weekly launch tracker",
      "5 hours a week in Meta Ads and Google Ads",
      "Re-uploading when a file name is wrong.",
      "4 hours a week in Asana and Slack",
      "I nudge the same five people every day.",
      "3 hours a week in Sheets",
      "Copy-pasting statuses from Asana into a spreadsheet.",
      "Approvals. Everything sits in someone's inbox.",
      "Prioritizing what launches first when everything is urgent.",
      "4",
    ],
  },
  {
    name: "Marcus Lee",
    role: "Performance Lead",
    team: "Growth",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-08T09:45:00Z",
    answers: [
      "I run paid media and report what's working.",
      "Pulling channel results into the weekly recap\nBuilding the performance deck\nBriefing creative on what worked",
      "5 hours a week in Looker and Sheets",
      "Exporting from four ad platforms and reconciling them by hand.",
      "3 hours a week in Slides",
      "Same slides every week with new numbers.",
      "1 hour a week in Slack",
      "Creative learnings get lost between launches.",
      "Waiting on final assets to set up tests.",
      "Deciding what to test next.",
      "3",
    ],
  },
  {
    name: "Jordan Kim",
    role: "Social Lead",
    team: "Growth",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-08T14:10:00Z",
    answers: [
      "I own organic social and the short-form cuts.",
      "Cutting 9:16 versions for TikTok and Reels\nWriting captions for each post\nCollecting references for the next shoot",
      "4 hours a week in Figma and Canva",
      "Landscape assets don't crop well, I redo them.",
      "3 hours a week in Google Docs",
      "Same caption rewritten five ways for each platform.",
      "2 hours a week on Pinterest and Drive",
      "Saving and sorting references takes forever.",
      "2 rounds per post.",
      "30 minutes a round.",
      "Feedback from brand on every post, sometimes two rounds.",
      "Reading the room on social, what's actually funny.",
      "5",
    ],
  },
  { name: "Priya Raman", role: "Brand Director", team: "Brand", invitedAt: "2026-10-05T09:00:00Z" },
];

export function blankInterview(id: string, name: string, role: string, team: string, invitedAt: string): Interview {
  return { id, name, role, team, status: "invited", invitedAt, completedAt: null, transcript: [], context: "", tasks: [], waits: "", keepHuman: "", satisfaction: null };
}

export function runScript(interview: Interview, answers: string[], company: string): RunnerState {
  let state: RunnerState = { phase: "intro", taskIndex: 0, interview };
  const transcript = [...interview.transcript];
  for (const a of answers) {
    transcript.push({ from: "ai", text: promptFor(state, company) }, { from: "person", text: a });
    state = answer(state, a);
  }
  return { ...state, interview: { ...state.interview, transcript } };
}

export const seedInterviews: Interview[] = scripts.map((s, i) => {
  const blank = blankInterview(`iv-seed-${i + 1}`, s.name, s.role, s.team, s.invitedAt);
  if (!s.answers) return blank;
  const { interview } = runScript(blank, s.answers, "Halcyon Outdoor Co.");
  return { ...interview, status: "completed", completedAt: s.completedAt ?? null };
});
