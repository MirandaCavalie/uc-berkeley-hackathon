import { answer, promptFor, type RunnerState } from "./engine/interview";
import type { Interview, Workspace } from "./types";

export const seedWorkspace: Workspace = {
  company: "Northwind Freight",
  industry: "Logistics",
  employees: "640 employees",
  synthetic: true,
  teamRoster: [
    { team: "Finance", employees: 70 },
    { team: "Customer Support", employees: 180 },
    { team: "Operations", employees: 210 },
    { team: "People", employees: 30 },
    { team: "Sales", employees: 100 },
    { team: "IT", employees: 50 },
  ],
};

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
    name: "Dana Okafor",
    role: "AP Specialist",
    team: "Finance",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-05T15:20:00Z",
    answers: [
      "I run accounts payable. Most of my week is invoices and vendor emails.",
      "Keying invoices into NetSuite\nMatching invoices to purchase orders\nAnswering vendor payment status emails\nMonth-end reconciliation",
      "About 12 hours a week, PDFs from email into NetSuite",
      "Every vendor uses a different layout so I retype every line by hand.",
      "6 hours a week in NetSuite and Excel",
      "Quantities never match.",
      "Last Tuesday a carrier billed 14 pallets, the PO said 12, and I spent an hour emailing the warehouse to find out who was right.",
      "4 hours a week in Outlook",
      "Vendors email three times asking the same question: when will we get paid?",
      "2 days a month in Excel",
      "I export from the bank and NetSuite and tick off lines by hand in Excel.",
      "Waiting on managers to approve invoices over $5,000. Some sit for a week.",
      "I tried ChatGPT to read a PDF invoice once, but we're not allowed to upload vendor data.",
      "Deciding whether to pay when a vendor disputes a charge. That needs someone who knows the relationship.",
      "5",
    ],
  },
  {
    name: "Marco Silva",
    role: "Financial Analyst",
    team: "Finance",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-06T10:05:00Z",
    answers: [
      "I own reporting for the CFO and the business units.",
      "Building the weekly KPI report\nMonth-end management pack\nBudget vs actuals variance commentary\nForecast updates with the sales team",
      "8 hours a week in Excel and Power BI",
      "I pull exports from NetSuite, the TMS and Salesforce and paste them into the same template every Monday.",
      "3 days a month in Excel and PowerPoint",
      "Same slides every month with new numbers, and one wrong cell breaks everything.",
      "4 hours a week in Excel",
      "Chasing department heads to explain why they overspent takes longer than the analysis.",
      "3 hours a week in Excel and Salesforce",
      "Sales numbers in Salesforce are never up to date when I need them.",
      "Waiting on data exports from IT and on sales to update the pipeline.",
      "I use Copilot in Excel to write formulas, nothing more.",
      "The story behind the numbers and what we recommend to the CFO.",
      "4",
    ],
  },
  {
    name: "Aisha Rahman",
    role: "Customer Support Lead",
    team: "Customer Support",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-06T14:40:00Z",
    answers: [
      "I lead a team of nine handling shipment questions from customers.",
      "Triaging the shared support inbox\nReplying to where is my shipment emails\nLogging call notes into Zendesk\nWeekly support metrics report",
      "10 hours a week across the team in Zendesk and the shared inbox",
      "Half the tickets land in the wrong queue and bounce around for a day.",
      "15 hours a week, mostly Zendesk and the TMS",
      "We look up the same tracking info in the TMS and paste it into a reply.",
      "5 hours a week in Zendesk",
      "After every call we retype the notes and the shipment number by hand.",
      "2 hours a week in Zendesk and Excel",
      "Exporting from Zendesk and building the same charts every Friday afternoon.",
      "Waiting on dispatch to tell us where a truck actually is.",
      "Some agents paste customer emails into ChatGPT to make replies sound nicer.",
      "Angry customers and escalations. They need a person who can make a call.",
      "5",
    ],
  },
  {
    name: "Tom Becker",
    role: "Support Agent",
    team: "Customer Support",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-06T16:10:00Z",
    answers: [
      "I answer customer emails and calls about shipments and delays.",
      "Answering customer emails about delays\nLooking up tracking in the TMS\nProcessing damage claim forms",
      "20 hours a week in Zendesk",
      "Same question twenty times a day.",
      "This morning a storm delayed forty shipments and I wrote basically the same apology email to every customer, one by one.",
      "6 hours a week in the TMS and Zendesk",
      "I copy-paste the tracking number between three screens because the TMS and Zendesk don't talk.",
      "4 hours a week in email and Excel",
      "Customers send photos and PDFs by email and I fill in the claim form by hand.",
      "Waiting on the claims team and on dispatch for updates I can give the customer.",
      "No, we're not supposed to.",
      "Calming down a customer whose shipment is late for their own customer.",
      "4",
    ],
  },
  {
    name: "Lucía Moreno",
    role: "Dispatcher",
    team: "Operations",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-07T08:30:00Z",
    answers: [
      "I plan pickups and assign drivers for the Bay Area depot.",
      "Scheduling pickups and delivery slots\nReassigning loads when drivers call out\nSending status updates to customers\nEntering proof of delivery into the TMS",
      "15 hours a week in the TMS and on the phone",
      "Customers email requests and I check driver capacity in one screen and the calendar in another.",
      "1 hour a day on the phone",
      "Every morning two or three drivers call out and I reshuffle the whole schedule by phone.",
      "5 hours a week, phone and email",
      "Customers call for an ETA because nobody tells them proactively.",
      "4 hours a week in the TMS",
      "Drivers send photos of signed paperwork and I type it all in.",
      "Waiting on drivers to send their paperwork and on customers to confirm a slot.",
      "No.",
      "Deciding which customer gets the last truck when we're short. That's about the relationship.",
      "4",
    ],
  },
  {
    name: "Kevin Osei",
    role: "Operations Manager",
    team: "Operations",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-07T12:15:00Z",
    answers: [
      "I run daily operations for three depots.",
      "Morning ops standup and status tracker\nCompiling the weekly on-time delivery report\nCarrier rate negotiations\nCapacity planning",
      "5 hours a week in Excel and Teams",
      "I chase every depot lead for the same numbers before the meeting.",
      "4 hours a week in the TMS and Excel",
      "The TMS export is messy and I clean it in Excel every single week.",
      "3 hours a week, calls and email",
      "Rates change constantly and I keep it all in my head.",
      "4 hours a week in Excel",
      "Our forecast is a spreadsheet I rebuild every Monday from scratch.",
      "Waiting on finance for the monthly numbers and on the depot leads for status.",
      "I've asked ChatGPT to summarize long carrier contracts.",
      "Carrier negotiations and anything to do with my people.",
      "5",
    ],
  },
  {
    name: "Hannah Lee",
    role: "HR Generalist",
    team: "People",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-07T16:45:00Z",
    answers: [
      "I handle hiring logistics and onboarding for 640 employees.",
      "Onboarding new hires\nScheduling candidate interviews\nAnswering employee policy questions\nWriting job descriptions",
      "6 hours a week in BambooHR, email and Slack",
      "Every new hire needs eleven accounts and I request each one by email to IT.",
      "5 hours a week in Outlook",
      "Finding a slot for four interviewers takes a dozen emails back and forth.",
      "4 hours a week in Slack and email",
      "I keep answering the same ten questions about PTO and benefits in Slack.",
      "2 hours a week in Docs",
      "Each one starts from an old version that's out of date.",
      "Waiting on IT to create accounts and on managers to approve offers.",
      "I use ChatGPT to polish job posts.",
      "Hiring decisions and hard conversations with employees.",
      "5",
    ],
  },
  {
    name: "Ryan Park",
    role: "Account Executive",
    team: "Sales",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-08T09:40:00Z",
    answers: [
      "I sell freight contracts to mid-market shippers.",
      "Researching prospects before calls\nUpdating Salesforce after meetings\nBuilding rate quotes\nClient calls and negotiations",
      "5 hours a week on LinkedIn and company websites",
      "I open ten tabs per prospect to figure out what they ship and where.",
      "3 hours a week in Salesforce",
      "I log notes at night because there's no time between calls.",
      "6 hours a week in Excel and email",
      "Every quote means pulling lane rates from three spreadsheets and writing the same email.",
      "10 hours a week, phone and Teams",
      "This is the job, I'd do more of it if I had the time.",
      "Waiting on pricing to approve custom rates. Quotes sit for two days.",
      "I use ChatGPT to write first drafts of follow-up emails.",
      "The relationship with the client and the negotiation.",
      "5",
    ],
  },
  {
    name: "Priya Nair",
    role: "Sales Operations Analyst",
    team: "Sales",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-08T13:20:00Z",
    answers: [
      "I keep the CRM clean and run the pipeline numbers.",
      "Cleaning duplicate accounts in Salesforce\nWeekly pipeline report\nRouting inbound leads to reps",
      "4 hours a week in Salesforce",
      "Reps create duplicates and nobody fills in the industry field.",
      "3 hours a week in Salesforce and Excel",
      "Leadership wants it every Monday and the dashboard never matches the spreadsheet.",
      "3 hours a week in HubSpot and Salesforce",
      "Leads wait a day in a queue before anyone touches them.",
      "Waiting on reps to update their deals.",
      "Not really.",
      "Territory planning with the sales director.",
      "4",
    ],
  },
  {
    name: "Owen Clarke",
    role: "IT Support Specialist",
    team: "IT",
    invitedAt: "2026-10-05T09:00:00Z",
    completedAt: "2026-10-08T17:05:00Z",
    answers: [
      "I run the help desk and access management.",
      "Provisioning accounts for new hires\nResetting passwords and access requests\nTriaging the IT ticket queue",
      "5 hours a week in Jira and the admin consoles",
      "Every system has its own admin console and its own checklist.",
      "6 hours a week in Jira",
      "Password resets.",
      "Yesterday I did fourteen resets by hand before lunch, all the same steps.",
      "4 hours a week in Jira",
      "People email instead of filing tickets, so I retype them.",
      "Waiting on managers to approve access to finance systems.",
      "I use Copilot to write scripts.",
      "Security decisions about who gets admin access.",
      "4",
    ],
  },
  { name: "Elena Rossi", role: "Payroll Specialist", team: "Finance", invitedAt: "2026-10-08T09:00:00Z" },
  { name: "Sam Patel", role: "Warehouse Supervisor", team: "Operations", invitedAt: "2026-10-08T09:00:00Z" },
];

export function blankInterview(id: string, name: string, role: string, team: string, invitedAt: string): Interview {
  return {
    id,
    name,
    role,
    team,
    status: "invited",
    invitedAt,
    completedAt: null,
    transcript: [],
    context: "",
    tasks: [],
    waits: "",
    aiToday: "",
    keepHuman: "",
    satisfaction: null,
  };
}

export function runScript(interview: Interview, answers: string[], company: string): RunnerState {
  let state: RunnerState = { step: "intro", taskIndex: 0, interview };
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
  const { interview } = runScript(blank, s.answers, seedWorkspace.company);
  return { ...interview, status: "completed", completedAt: s.completedAt ?? null };
});
