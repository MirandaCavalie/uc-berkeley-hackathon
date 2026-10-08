import type {
  BrandKit,
  EvidenceItem,
  LaunchInput,
  Reference,
  ReviewInput,
  StudioInput,
  Workspace,
} from "./types";

// Synthetic sample workspace. Every number the product shows for this workspace is
// derived from these files, and the UI labels them as synthetic.

const at = "2026-10-08T09:00:00.000Z";

export const seedWorkspace: Workspace = {
  company: "Halcyon Outdoor Co.",
  industry: "Outdoor apparel · DTC + wholesale",
  teamSize: "42-person marketing org",
  synthetic: true,
};

export const seedBrand: BrandKit = {
  name: "Halcyon Outdoor Co.",
  tagline: "Find your quiet.",
  voice:
    "Calm, grounded, quietly confident. We speak like a trusted trail guide, not a hype machine. Short sentences. Concrete details over superlatives.",
  audience:
    "Urban professionals, 28–45, who escape outdoors on weekends and care about durability and sustainability.",
  colors: [
    { name: "Pine", hex: "#1F3D2B", usage: "Primary. Logo, headlines, CTA buttons." },
    { name: "Fog", hex: "#EEEAE2", usage: "Backgrounds and negative space." },
    { name: "Ember", hex: "#D9622B", usage: "Accent only. Max 10% of canvas. Never on CTAs." },
    { name: "Granite", hex: "#34342F", usage: "Body text." },
    { name: "Glacier", hex: "#A7C4CF", usage: "Secondary. Cold-weather product stories." },
  ],
  typography: { display: "Söhne Breit", body: "Söhne" },
  bannedWords: [
    "epic",
    "ultimate",
    "crush",
    "beast",
    "guaranteed",
    "warmest",
    "revolutionary",
    "game-changing",
  ],
  claimRules: [
    { avoid: "recycled down", use: "75% recycled fill" },
    { avoid: "warmest", use: "our most insulated Ridgeline yet" },
    { avoid: "waterproof", use: "water-resistant" },
  ],
  guidelines: [
    "Logo lockup sits bottom-right at a minimum of 8% of canvas width. Never enlarge for emphasis.",
    "Product occupies at least 40% of frame in paid placements.",
    "Use natural, slightly cool color grading. Avoid orange-heavy LUTs.",
    "One idea per asset. No more than one exclamation mark per campaign.",
  ],
  logoDataUrl: null,
};

const brief = `CAMPAIGN BRIEF — "Find Your Quiet" · Fall 2026
Product: Ridgeline Insulated Jacket (new)
Owner: Elena Park, Marketing Manager · Launch: Oct 20, 2026

Objective
Launch Ridgeline as the hero of our fall line and grow first-week sales from members by 20% vs. the Spring launch.

Audience
Urban professionals 28–45 who escape to the mountains on weekends. They distrust hype, research materials, and care that gear lasts.

Key message
Ridgeline keeps you warm enough to stay out longer — so you can find the quiet most people turn back before reaching.

Offer
Members get 15% off + free shipping during launch week (Oct 20–27).

Channels & deliverables (38 assets)
Instagram feed, Instagram stories, TikTok, Meta paid social (14 sizes), Google display, Email (launch + reminder), Paid search, Website hero, Retail in-store poster.

Mandatories
- Logo lockup bottom-right.
- Material claim must read exactly "75% recycled fill".
- No "warmest" claim (not substantiated).
- CTA: "Shop Ridgeline".

Open questions
Do we lead with the product or with the landscape? Do we need CA-FR versions for launch?`;

const slack = `#fall-launch-review — Slack export
[Mon 9:12] Dana Ortiz (CMO): Hero is close. The headline feels too quiet for a launch — can we make it bolder? Something like "Built for the cold nobody else will face".
[Mon 9:40] Priya Raman (Brand Director): Love the restraint. Please keep the headline calm — "Find Your Quiet" is the platform. Let's not go loud.
[Mon 10:05] Marcus Lee (Performance Lead): Need the CTA visible in the first 2 seconds for stories. Also the product should be bigger, it's lost in the landscape.
[Mon 10:22] Priya Raman (Brand Director): Ember orange on the CTA is too much, use Pine.
[Mon 11:03] Dana Ortiz (CMO): Can we try a warmer color grade? Feels cold.
[Mon 13:47] Marcus Lee (Performance Lead): +1 on bigger product. Our last test showed product-forward creative had 1.8x CTR.
[Mon 14:10] Jordan Kim (Social Lead): For TikTok we need a 9:16 cut with captions, the landscape crop won't work.
[Tue 8:55] Dana Ortiz (CMO): Logo feels small.`;

const legal = `Email — From: Sam Whitfield (Legal Counsel) · Subject: RE: Ridgeline claims review
Team — three items before anything ships:
1. "Warmest jacket we've ever made" cannot run without test substantiation. Replace with "Our most insulated Ridgeline yet" or remove.
2. "75% recycled down" must read "75% recycled fill" per the supplier certificate.
3. Please remove "guaranteed" from the email subject line.
Happy to turn around the next version same day.`;

const figma = `Figma comments — Ridgeline Hero v3
- Priya Raman (Brand Director): Headline typeface should be Söhne Breit, not Inter.
- Dana Ortiz (CMO): Make the logo bigger, bottom right feels lost.
- Priya Raman (Brand Director): Logo size is correct per brand book (min 8% width). Do not enlarge.
- Alex Chen (Design Lead): Spacing between headline and subhead is inconsistent across sizes.
- Marcus Lee (Performance Lead): The jacket needs to be at least 40% of frame.
- Dana Ortiz (CMO): Colors feel cold, warm it up.`;

const timeline = `stage,owner,start,end,round,notes
Brief intake,Marketing Manager,2026-09-01,2026-09-03,1,Brief drafted from strategy deck
Brief clarification,Design Lead,2026-09-03,2026-09-08,1,3 rounds of Slack questions on audience and mandatories
Moodboard & references,Designer,2026-09-08,2026-09-11,1,Pinterest + past campaigns pulled by hand
Concept development,Design Team,2026-09-11,2026-09-18,1,3 creative routes presented
Creative review,Stakeholders,2026-09-18,2026-09-23,1,Feedback split across Slack + email + Figma
Feedback consolidation,Design Lead,2026-09-23,2026-09-25,1,Manually reconciled 31 comments
Revision,Designer,2026-09-25,2026-09-29,2,
Creative review,Stakeholders,2026-09-29,2026-10-02,2,Conflicting direction CMO vs Brand
Feedback consolidation,Design Lead,2026-10-02,2026-10-03,2,Manually reconciled 18 comments
Revision,Designer,2026-10-03,2026-10-06,3,
Legal review,Legal,2026-10-06,2026-10-08,3,Claim substitutions requested
Final approval,CMO,2026-10-08,2026-10-09,3,
Channel adaptation,Production Designer,2026-10-09,2026-10-15,3,38 assets across 9 channels resized and re-copied by hand
Asset handoff,Marketing Ops,2026-10-15,2026-10-17,3,DAM upload + ad platforms; naming fixes`;

const requests = `Asana export — Creative requests (Fall launch)
#1182 Resize hero to 14 paid social sizes · Production · est 6h
#1183 Write 5 headline variants for Meta A/B test · Copy · est 3h
#1184 Adapt email header for dark mode · Production · est 2h
#1185 Re-export assets with correct naming convention · Marketing Ops · est 2h
#1186 Pull reference images for winter shoot · Designer · est 4h
#1187 Translate launch copy for CA-FR market · Copy · est 5h
#1191 Re-check all copy against legal claims list · Copy · est 3h
#1192 Weekly creative performance recap deck · Performance · est 4h`;

const performance = `channel,impressions,ctr,cpa,notes
Meta paid social,1840000,1.12%,$38.40,Product-forward variants won 1.8x CTR
Instagram stories,920000,0.74%,$51.10,CTA after 3s underperformed
TikTok,1310000,0.95%,$44.20,Captions lifted completion 22%
Google display,2200000,0.31%,$62.80,
Email,410000,3.90%,$12.10,Subject lines without urgency words performed the same
Paid search,380000,5.60%,$18.90,`;

export const seedEvidence: EvidenceItem[] = [
  { id: "ev-brief", title: "Find Your Quiet — campaign brief", kind: "brief", source: "Google Docs", content: brief, addedAt: at },
  { id: "ev-slack", title: "#fall-launch-review thread", kind: "feedback", source: "Slack", content: slack, addedAt: at },
  { id: "ev-legal", title: "Legal claims review", kind: "feedback", source: "Email", content: legal, addedAt: at },
  { id: "ev-figma", title: "Hero v3 comments", kind: "feedback", source: "Figma", content: figma, addedAt: at },
  { id: "ev-timeline", title: "Approval timeline — Fall launch", kind: "approvals", source: "Asana export", content: timeline, addedAt: at },
  { id: "ev-requests", title: "Creative request queue", kind: "requests", source: "Asana", content: requests, addedAt: at },
  { id: "ev-performance", title: "Spring 2026 channel results", kind: "performance", source: "Looker", content: performance, addedAt: at },
];

export const seedReviewInput: ReviewInput = {
  assetName: "Ridgeline Hero v3",
  feedback: [slack, legal, figma].join("\n\n"),
};

export const seedLaunchInput: LaunchInput = {
  brief,
  channels: [
    "Instagram feed",
    "Instagram stories",
    "TikTok",
    "Meta paid social",
    "Email",
    "Paid search",
    "Website hero",
  ],
};

export const seedStudioInput: StudioInput = {
  theme: "Find your quiet — the stillness you only reach when you stay out longer than everyone else.",
  constraints: "Fall/winter launch. Must sit inside the Halcyon palette. Product must stay hero in paid placements.",
};

export const seedReferences: Reference[] = [
  { id: "ref-1", kind: "note", title: "Spring learnings", value: "Product-forward creative won 1.8x CTR on Meta. Captions lifted TikTok completion 22%.", addedAt: at },
  { id: "ref-2", kind: "link", title: "Patagonia — Worn Wear film stills", value: "https://www.patagonia.com/stories/", addedAt: at },
  { id: "ref-3", kind: "note", title: "Creative director's note", value: "We own silence in a category that shouts. Lean into negative space and real cold light.", addedAt: at },
];

export const channelCatalog = [
  "Instagram feed",
  "Instagram stories",
  "TikTok",
  "Meta paid social",
  "Google display",
  "Email",
  "Paid search",
  "Website hero",
  "Retail poster",
  "LinkedIn",
];
