import type { WorkMode, WorkflowKey } from "./schemas";

export interface CaseStep {
  name: string;
  owner: string;
  tools: string;
  mode: WorkMode;
  signal: string;
  loop?: boolean;
}

export interface WorkflowCase {
  id: string;
  name: string;
  context: string;
  trigger: string;
  output: string;
  sources: string[];
  steps: CaseStep[];
  leaks: string[];
  human: string[];
  pilot: string;
  workflow: WorkflowKey;
  href: string;
  detect: RegExp;
}

export const workflowCases: WorkflowCase[] = [
  {
    id: "creative-review",
    name: "Creative review & approval",
    context: "Brand team + agency · CPG, retail, consumer tech",
    trigger: "A designer shares a draft",
    output: "Approved master asset",
    sources: ["Slack", "Email", "Figma", "Frame.io", "Asana"],
    steps: [
      { name: "Share draft", owner: "Designer", tools: "Figma, Frame.io", mode: "automate", signal: "New version link posted in a review channel" },
      { name: "Stakeholder feedback", owner: "CMO, Brand, Performance", tools: "Slack, email, Figma", mode: "human", signal: "Comments with author, timestamp, and asset version", loop: true },
      { name: "Consolidate feedback", owner: "Design lead", tools: "Doc, spreadsheet", mode: "assist", signal: "Timeline note like “reconciled 31 comments”", loop: true },
      { name: "Resolve conflicts", owner: "Brand director, CMO", tools: "Meeting, Slack", mode: "human", signal: "Opposite requests on the same element" },
      { name: "Revise", owner: "Designer", tools: "Figma", mode: "human", signal: "Version number increments (v2 → v3)", loop: true },
      { name: "Final approval", owner: "CMO", tools: "Asana, email", mode: "human", signal: "Task status changes to Approved" },
    ],
    leaks: ["The same comment arrives through three channels", "Contradictions surface only after a revision", "Designers reconcile feedback by hand"],
    human: ["Taste and direction", "Resolving CMO vs brand conflicts", "Final approval"],
    pilot: "Consolidate feedback into one brief with conflicts flagged",
    workflow: "review",
    href: "/review",
    detect: /feedback|reconcil|creative review/i,
  },
  {
    id: "channel-adaptation",
    name: "Channel adaptation & versioning",
    context: "Global retail and DTC brands",
    trigger: "Master asset approved",
    output: "Every size and copy variant, ready to traffic",
    sources: ["Asana", "Figma", "Trafficking sheet", "DAM"],
    steps: [
      { name: "Collect specs", owner: "Marketing ops", tools: "Spec sheet", mode: "automate", signal: "Trafficking sheet with sizes and limits per placement" },
      { name: "Resize & recrop", owner: "Production designer", tools: "Figma, Photoshop", mode: "assist", signal: "Tickets like “resize hero to 14 sizes”" },
      { name: "Fit copy to limits", owner: "Copywriter", tools: "Doc", mode: "assist", signal: "Headline variant requests and character-limit errors" },
      { name: "Brand & claims check", owner: "Brand, Legal", tools: "PDF markup", mode: "assist", signal: "“Re-check copy against claims list” tickets" },
      { name: "Name & export", owner: "Marketing ops", tools: "DAM", mode: "automate", signal: "Re-export tickets for naming conventions" },
      { name: "Upload to platforms", owner: "Media team", tools: "Meta, Google Ads", mode: "human", signal: "Upload logs in the ad platforms" },
    ],
    leaks: ["Each size is rebuilt by hand", "Copy rewritten per channel from scratch", "Naming errors force re-exports"],
    human: ["Focal point and crop judgment", "Publishing to ad platforms"],
    pilot: "Draft every channel variant from the approved brief, checked against brand rules",
    workflow: "launch",
    href: "/launch",
    detect: /resiz|sizes|channel adaptation|adapt/i,
  },
  {
    id: "mlr-review",
    name: "Medical-legal-regulatory (MLR) review",
    context: "Pharma and healthcare marketing",
    trigger: "Promotional piece ready for review",
    output: "Approved piece with referenced claims",
    sources: ["Veeva PromoMats", "Claims library", "Email"],
    steps: [
      { name: "Annotate claims", owner: "Brand team, agency", tools: "Veeva PromoMats", mode: "assist", signal: "Reference links attached to each claim" },
      { name: "Pre-check claims", owner: "Agency", tools: "Claims library", mode: "automate", signal: "Approved claims list and past rejection reasons" },
      { name: "Medical review", owner: "Medical reviewer", tools: "Veeva PromoMats", mode: "human", signal: "Reviewer annotations and status", loop: true },
      { name: "Legal & regulatory review", owner: "Legal, Regulatory", tools: "Veeva PromoMats", mode: "human", signal: "Change requests per claim", loop: true },
      { name: "Revise & resubmit", owner: "Agency", tools: "InDesign", mode: "assist", signal: "Resubmission with a new version number", loop: true },
    ],
    leaks: ["Pieces rejected for issues a rules check would catch", "References re-linked by hand on every version"],
    human: ["Every medical, legal, and regulatory approval"],
    pilot: "Check claims against the approved library before submission",
    workflow: "none",
    href: "/brand",
    detect: /\bmlr\b|medical review|regulatory/i,
  },
  {
    id: "localization",
    name: "Localization & transcreation",
    context: "Global consumer brands",
    trigger: "Master campaign approved",
    output: "Market-ready versions",
    sources: ["TMS (Smartling, Phrase)", "Email", "Figma"],
    steps: [
      { name: "Freeze source copy", owner: "Copy lead", tools: "Doc", mode: "human", signal: "Final copy doc locked" },
      { name: "First-pass translation", owner: "Translation vendor", tools: "TMS", mode: "automate", signal: "Translation jobs and vendor emails" },
      { name: "Glossary & claims check", owner: "Local marketing", tools: "Glossary sheet", mode: "automate", signal: "Glossary and per-market claim rules" },
      { name: "Transcreate headlines", owner: "Local creative", tools: "Doc", mode: "human", signal: "Headline rewrites that differ from translation" },
      { name: "Re-layout per language", owner: "Production designer", tools: "Figma, InDesign", mode: "assist", signal: "Comments about text overflow" },
      { name: "In-market review", owner: "Local lead", tools: "Email", mode: "human", signal: "Approval emails per market", loop: true },
    ],
    leaks: ["Terminology fixed again in every market", "Layouts break when copy runs longer"],
    human: ["Cultural fit and headline transcreation", "Market sign-off"],
    pilot: "Translate with the brand glossary and flag per-market claim issues",
    workflow: "launch",
    href: "/launch",
    detect: /translat|locali|CA-FR/i,
  },
  {
    id: "performance-reporting",
    name: "Weekly performance reporting",
    context: "B2B SaaS and DTC growth teams",
    trigger: "Every Monday",
    output: "Recap deck with decisions",
    sources: ["Meta Ads", "Google Ads", "GA4", "Looker", "Slides"],
    steps: [
      { name: "Export platform data", owner: "Performance analyst", tools: "Meta Ads, Google Ads, GA4", mode: "automate", signal: "Same CSV exports at the same time each week" },
      { name: "Clean & merge", owner: "Performance analyst", tools: "Spreadsheet", mode: "automate", signal: "One spreadsheet edited every week" },
      { name: "Build charts", owner: "Performance analyst", tools: "Slides, Looker", mode: "automate", signal: "Deck duplicated from last week" },
      { name: "Write the narrative", owner: "Performance lead", tools: "Slides", mode: "assist", signal: "Notes like “what changed and why”" },
      { name: "Decide next actions", owner: "Marketing leadership", tools: "Meeting", mode: "human", signal: "Action items after the review" },
    ],
    leaks: ["Hours spent copying numbers between tools", "Insights written last, under time pressure"],
    human: ["Interpreting why results moved", "Budget and creative decisions"],
    pilot: "Draft the weekly recap from platform exports",
    workflow: "none",
    href: "/radar",
    detect: /recap|report|deck/i,
  },
  {
    id: "request-intake",
    name: "Creative request intake",
    context: "In-house creative teams",
    trigger: "Someone asks for an asset",
    output: "Scoped brief in the queue",
    sources: ["Slack", "Email", "Asana", "Jira"],
    steps: [
      { name: "Request arrives", owner: "Any team", tools: "Slack DM, email", mode: "automate", signal: "Messages like “can you make…”" },
      { name: "Clarify missing info", owner: "Creative ops", tools: "Slack", mode: "assist", signal: "Back-and-forth questions before work starts", loop: true },
      { name: "Write the brief", owner: "Requester", tools: "Asana form", mode: "assist", signal: "Briefs edited after submission" },
      { name: "Prioritize & assign", owner: "Creative director", tools: "Asana", mode: "human", signal: "Assignee and due date set" },
    ],
    leaks: ["Briefs arrive without audience, sizes, or deadlines", "Clarification rounds delay the start"],
    human: ["Prioritization", "Creative scoping"],
    pilot: "Turn any request into a structured brief and ask for missing fields",
    workflow: "none",
    href: "/radar",
    detect: /clarification|request/i,
  },
  {
    id: "creator-content",
    name: "Creator content approval",
    context: "Beauty, DTC, and CPG influencer programs",
    trigger: "A creator submits a draft",
    output: "Approved post with disclosure",
    sources: ["Email", "Google Drive", "Creator platform"],
    steps: [
      { name: "Collect drafts", owner: "Influencer manager", tools: "Drive, email", mode: "automate", signal: "Draft links shared by creators" },
      { name: "Disclosure & claims check", owner: "Influencer manager", tools: "Checklist", mode: "automate", signal: "#ad disclosure and banned claims in captions" },
      { name: "Brand fit review", owner: "Brand manager", tools: "Drive", mode: "human", signal: "Approve or reject notes", loop: true },
      { name: "Feedback to creator", owner: "Influencer manager", tools: "Email, DM", mode: "assist", signal: "Revision requests per draft", loop: true },
      { name: "Log usage rights", owner: "Legal ops", tools: "Spreadsheet", mode: "automate", signal: "Rights and expiry dates per asset" },
    ],
    leaks: ["Missing disclosures caught late", "Feedback scattered across DMs"],
    human: ["Brand fit and authenticity", "Creator relationship"],
    pilot: "Check every draft for disclosure and claims before brand review",
    workflow: "none",
    href: "/brand",
    detect: /creator|influencer|#ad\b/i,
  },
];
