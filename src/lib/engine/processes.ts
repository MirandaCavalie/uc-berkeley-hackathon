import type { Scores, Solution } from "../types";

export interface ProcessDef {
  name: string;
  re: RegExp;
  description: string;
  /** Rule-based answer, used when Jev is off or unsure. */
  solution: Solution;
  scores: Scores;
  trigger: string;
  inputs: string;
  output: string;
  checkpoint: string;
  metric: string;
}

const s = (feasibility: number, dataReadiness: number, risk: number, effort: number, adoption: number): Scores => ({
  feasibility,
  dataReadiness,
  risk,
  effort,
  adoption,
});

/** Order matters: the first pattern that matches a task wins. */
export const processes: ProcessDef[] = [
  {
    name: "Invoice & expense processing",
    re: /invoice|expense|receipt|payable|billing|purchase order|\bpos?\b/i,
    description: "Reading invoices and receipts, matching them to orders, coding and routing them for payment.",
    solution: "agent",
    scores: s(4, 4, 3, 3, 4),
    trigger: "a new invoice or receipt arrives in the inbox",
    inputs: "the PDF, the matching purchase order, and the vendor record",
    output: "a coded entry ready to post, or an exception with the reason",
    checkpoint: "amounts don't match the order or exceed the approval limit",
    metric: "Invoices processed per hour, and the exception rate",
  },
  {
    name: "Reconciliation & data checks",
    re: /reconcil|match(ing)? .*(records|accounts|statements)|audit|double[- ]check|verify|spot[- ]check|\bqa\b|errors|check(ing)? (each|every|against)/i,
    description: "Comparing records across systems and chasing the lines that don't match.",
    solution: "agent",
    scores: s(4, 4, 3, 3, 4),
    trigger: "a period closes or a new export lands",
    inputs: "exports from both systems",
    output: "a matched set plus a short list of real discrepancies",
    checkpoint: "a discrepancy needs a correcting entry",
    metric: "Hours to close, and discrepancies found after close",
  },
  {
    name: "Inbox & ticket triage",
    re: /triage|ticket|inbox|queue|rout(e|ing)|categori|shared mailbox/i,
    description: "Reading incoming requests, tagging them, and sending each one to the right person.",
    solution: "agent",
    scores: s(4, 4, 2, 2, 4),
    trigger: "a request lands in the shared inbox or ticket queue",
    inputs: "the message, the customer record, and past tickets",
    output: "a tagged, prioritized ticket assigned to the right owner",
    checkpoint: "the request is urgent, angry, or doesn't fit a category",
    metric: "Time to first assignment, and reassignment rate",
  },
  {
    name: "Customer replies & FAQs",
    re: /repl(y|ies)|respond|answer(ing)? (customer|client|the same|\w+ questions)|faq|where is my|customer (emails?|questions?)|questions about|chat/i,
    description: "Writing answers to customer and partner questions, most of them repeats.",
    solution: "skill",
    scores: s(4, 3, 3, 1, 4),
    trigger: "a customer question is opened",
    inputs: "the question, order status, and the help-center articles",
    output: "a draft reply in the company's tone",
    checkpoint: "the reply promises a refund, credit, or date",
    metric: "Handle time per ticket, and customer satisfaction",
  },
  {
    name: "Lead research & CRM hygiene",
    re: /lead|prospect|enrich|crm|salesforce|hubspot|account research/i,
    description: "Researching companies and contacts, and keeping CRM records complete.",
    solution: "agent",
    scores: s(4, 3, 2, 2, 4),
    trigger: "a new lead is created or a deal changes stage",
    inputs: "the company website, LinkedIn, and past emails",
    output: "an enriched CRM record with a short account brief",
    checkpoint: "the agent wants to email the prospect",
    metric: "Minutes of research per lead, and CRM field completeness",
  },
  {
    name: "Reporting & dashboards",
    re: /report|dashboard|kpi|metrics|recap|numbers|weekly (deck|slides)|performance deck|month[- ]end pack/i,
    description: "Pulling numbers from several tools into the same weekly or monthly report.",
    solution: "automation",
    scores: s(5, 4, 2, 2, 5),
    trigger: "the reporting schedule (weekly or month-end)",
    inputs: "exports from the source systems",
    output: "the finished report or dashboard, with a written summary of changes",
    checkpoint: "a number moves more than the usual range",
    metric: "Hours per report, and how late it ships",
  },
  {
    name: "Data entry & system updates",
    re: /data entry|enter(ing)?|re-?typ|timesheets?|keyed|copy(ing)?[- ]past|key(ing)? in|input(ting)?|fill(ing)? (in|out)|updat(e|ing) (the )?(erp|system|sheet|spreadsheet|records?)|log(ging)? /i,
    description: "Retyping information from emails, PDFs, or one system into another.",
    solution: "automation",
    scores: s(5, 4, 2, 2, 5),
    trigger: "a record changes in the source system",
    inputs: "the source record or document",
    output: "the same data written to the destination system",
    checkpoint: "a required field is missing or ambiguous",
    metric: "Records keyed by hand per week, and entry errors",
  },
  {
    name: "Scheduling & coordination",
    re: /schedul|calendar|book(ing)?|coordinat|dispatch|shift|rota|pickups?|deliver(y|ies) slots?/i,
    description: "Finding times, booking slots, and reshuffling plans when something changes.",
    solution: "automation",
    scores: s(4, 3, 2, 3, 4),
    trigger: "a booking request or a change to the plan",
    inputs: "calendars, capacity, and constraints",
    output: "a confirmed slot sent to everyone involved",
    checkpoint: "no slot satisfies every constraint",
    metric: "Time to confirm a booking, and reschedules",
  },
  {
    name: "Status updates & follow-ups",
    re: /status|follow(ing)?[- ]?ups?|chas(e|ing)|nudg|remind|standup|tracker|update (the )?(team|stakeholders|clients?)/i,
    description: "Asking people where things stand and copying the answer into trackers and updates.",
    solution: "automation",
    scores: s(5, 4, 1, 1, 5),
    trigger: "an item goes past its due date, or the weekly update is due",
    inputs: "the tracker and recent activity",
    output: "a reminder to the owner, and a status digest for stakeholders",
    checkpoint: "an item is blocked for more than a week",
    metric: "Hours spent chasing, and items overdue",
  },
  {
    name: "Onboarding & access requests",
    re: /onboard|new hires?|access|account set ?up|provision|orientation|offboard|equipment/i,
    description: "Setting up accounts, equipment, documents, and first-week plans for new people.",
    solution: "agent",
    scores: s(4, 3, 3, 4, 4),
    trigger: "a new hire is signed in the HR system",
    inputs: "the role, start date, and the access checklist for that role",
    output: "accounts requested, documents sent, and a first-week plan",
    checkpoint: "access to sensitive systems or anything off the checklist",
    metric: "Days until a new hire is fully set up",
  },
  {
    name: "Document drafting",
    re: /draft|proposal|contract|quote|quotation|rfp|policy|job (description|post)|write|writing|templates?|letters?/i,
    description: "Writing proposals, quotes, policies, and contracts that mostly reuse past versions.",
    solution: "skill",
    scores: s(4, 3, 3, 2, 4),
    trigger: "someone starts a new proposal, quote, or document",
    inputs: "the request, past versions, and the template",
    output: "a first draft that follows the template",
    checkpoint: "pricing, legal terms, or commitments change",
    metric: "Hours per document, and turnaround time",
  },
  {
    name: "Research & summarization",
    re: /research|summar|meeting notes|minutes|read(ing)? (through|documents|contracts)|notes|digest|compil/i,
    description: "Reading long documents, calls, or threads and turning them into short notes.",
    solution: "skill",
    scores: s(5, 3, 2, 1, 4),
    trigger: "a meeting ends or a long document arrives",
    inputs: "the transcript, document, or thread",
    output: "a summary with decisions and next steps",
    checkpoint: "the summary is shared outside the team",
    metric: "Minutes from meeting to notes",
  },
  {
    name: "Approvals & sign-off",
    re: /approv|sign[- ]?off|authori[sz]/i,
    description: "Deciding whether something can go ahead and taking responsibility for it.",
    solution: "human",
    scores: s(2, 3, 5, 3, 2),
    trigger: "a request needs a decision",
    inputs: "the request and its supporting documents",
    output: "a decision with a reason",
    checkpoint: "always",
    metric: "Time waiting for a decision",
  },
  {
    name: "Negotiation & relationships",
    re: /negotiat|relationship|client calls?|account management|escalat|renewals?|partners?/i,
    description: "Calls, negotiations, and escalations where trust and judgment matter.",
    solution: "human",
    scores: s(1, 2, 5, 4, 1),
    trigger: "a client or partner needs a conversation",
    inputs: "the account history",
    output: "a decision or agreement",
    checkpoint: "always",
    metric: "Retention and deal outcomes",
  },
  {
    name: "Planning & people decisions",
    re: /plan(ning)?|strateg|forecast|budget|prioriti|hiring|interview(ing)? candidates|coach|1:1|one[- ]on[- ]ones?|performance reviews?/i,
    description: "Setting priorities, plans, budgets, and making decisions about people.",
    solution: "human",
    scores: s(2, 3, 4, 4, 2),
    trigger: "a planning cycle or a people decision",
    inputs: "the numbers and context behind the decision",
    output: "a plan or decision owned by a person",
    checkpoint: "always",
    metric: "Quality of plans, judged by the team",
  },
];

export const OTHER = "Other";

export function classifyTask(text: string): string {
  return processes.find((p) => p.re.test(text))?.name ?? OTHER;
}

export const processByName = (name: string) => processes.find((p) => p.name === name);

export const solutionMeta: Record<Solution, { label: string; short: string; definition: string }> = {
  automation: {
    label: "Automation",
    short: "Rule-based flow",
    definition:
      "A fixed sequence that runs on a trigger or a schedule: moving data between systems, building a report, sending reminders. The same input always gives the same output.",
  },
  skill: {
    label: "AI skill",
    short: "Person invokes it",
    definition:
      "A reusable AI capability a person calls inside their own work, such as drafting, summarizing, or extracting. The person stays in charge of the result.",
  },
  agent: {
    label: "AI agent",
    short: "Runs the loop, asks at checkpoints",
    definition:
      "Multi-step work toward a goal: reading messy inputs, deciding the next step, and acting across several tools. A person approves at checkpoints.",
  },
  human: {
    label: "Keep human",
    short: "AI only prepares",
    definition: "Judgment, relationships, or accountability where mistakes are costly. AI prepares information; people decide.",
  },
};

export interface Blueprint {
  headline: string;
  steps: string[];
  checkpoint: string;
  metric: string;
}

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

export function blueprint(p: ProcessDef, solution: Solution, tools: string[], teams: string[]): Blueprint {
  const where = tools.length ? list(tools.slice(0, 3)) : "the tools the team already uses";
  const who = teams.length ? list(teams.slice(0, 3)) : "the team";
  switch (solution) {
    case "automation":
      return {
        headline: `Runs on its own when ${p.trigger}.`,
        steps: [`Pulls ${p.inputs}, connected to ${where}.`, `Produces ${p.output}.`, `Posts the result where ${who} already work.`],
        checkpoint: `Alerts a person when ${p.checkpoint}.`,
        metric: p.metric,
      };
    case "skill":
      return {
        headline: `${who} call it from ${where} when ${p.trigger}.`,
        steps: [`The person gives it ${p.inputs}.`, `It returns ${p.output}.`, "The person edits and sends it."],
        checkpoint: `A person reviews every output, and always when ${p.checkpoint}.`,
        metric: p.metric,
      };
    case "agent":
      return {
        headline: `Picks up the work when ${p.trigger}, and works through it in ${where}.`,
        steps: [`Reads ${p.inputs}.`, "Decides the next step and takes it.", `Delivers ${p.output}.`],
        checkpoint: `Stops and asks ${who} when ${p.checkpoint}.`,
        metric: p.metric,
      };
    case "human":
      return {
        headline: `Stays with ${who}.`,
        steps: [`AI gathers ${p.inputs} beforehand.`, "A person makes the call."],
        checkpoint: "People own every decision.",
        metric: p.metric,
      };
  }
}
