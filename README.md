# CreativeOps Radar

**Let AI take the busywork. Keep the creative work creative.**

In-house brand teams lose weeks to the feedback loop. A single hero asset collects 30+ comments across Slack, email, and Figma; a design lead reconciles them by hand; reviewers contradict each other and the brand book; and every unresolved conflict becomes another revision round. CreativeOps Radar's **Review Loop** consolidates every round in minutes: it groups the comments, removes duplicates, catches conflicts (including against the brand book), names who has to decide, and writes a revision brief that only fills with human-approved changes. AI organizes the feedback; designers keep the design.

The product proves its own value. **Team Interviews** capture the baseline from the people in the loop (rounds per asset, hours per round, where work waits), the approval timeline supplies the calendar days, and every consolidated round is measured against both.

**Customer:** in-house brand and marketing teams that own a brand book and ship campaigns on repeat. **Wedge:** the creative review loop. **Labs:** Radar, Learning, Campaign Launch, and Creative Studio show where the platform expands next.

Built for the [Innovation Intelligence Hackathon](docs/HACKATHON.md) at UC Berkeley (AI-Native Enterprise track), Oct 2026.

![Overview](docs/screenshots/overview.png)

## What's in the platform

| Area | What it does |
| --- | --- |
| **Review Loop** (the product) | Consolidates one feedback round from Slack, email, and Figma into themes, duplicates, contradictions (including conflicts with the brand book), one blocking decision with a named owner, and a revision brief that only fills with human-approved changes. A before/after panel compares today's loop (rounds, days consolidating, comments reconciled by hand, hours per month) with this round, measured live. |
| **Team Interviews** (baseline) | Async AI interviews with everyone who touches campaign work. A short adaptive chat asks each person for their recurring tasks, hours, tools, what slows them down, where they wait on others, and what must stay human; it probes again when an answer has no usable number. Creative roles also get two review-loop questions (rounds per asset, hours per round). A plain-text designer guide can be copied for live interviews. Results roll up into prioritized findings by stage with hours/month mapped, recoverable hours, projected annual savings, first-month ROI, and satisfaction, all from editable assumptions. One click sends the interviews to Radar as evidence. |
| **Workflow Learning** (labs) | Shows how the platform learns a manual workflow: connect sources → extract events (who, what, when, which stage) → reconstruct the real path with loops, handoffs, and manual work → the team confirms each step → measure the pilot. Includes 7 mapped real-world cases (creative review, channel adaptation, pharma MLR review, localization, performance reporting, request intake, creator content), each step tagged with the signal it is learned from. |
| **Radar** (labs) | Maps the workflow from evidence, splits hours into automate / AI-assisted / keep creative, and ranks opportunities on 7 transparent dimensions. Every claim links to a verbatim quote from the source. |
| **Campaign Launch** (labs) | Adapts an approved brief into every channel spec (Instagram, TikTok, Meta, display, email, search, web, retail, LinkedIn) with character limits and a live, deterministic brand check. A person approves each asset; nothing auto-publishes. |
| **Creative Studio** (labs) | A sparring partner, not a replacement: a reference board plus safe / stretch / bold territories built from the brand system. The team picks a direction. |
| **Brand Kit** | The brand book as rules AI can follow: palette, typography, voice, banned words, and approved claims. The checker runs as code, so no prompt can talk its way around a banned word. |

### Principles baked into the product

- **Evidence first.** Quotes are checked verbatim against the source and marked verified or unverified in the UI.
- **No invented numbers.** Hours come from the timeline and request queue; assumptions are listed on the page. Sample data is labeled **Synthetic** everywhere.
- **People own the creative calls.** AI never picks a side in a conflict, and every workflow ends at a human approval.
- **Out of scope by design:** auto-publishing and autonomous brand or legal approval.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. The workspace comes preloaded with a synthetic company (Halcyon Outdoor Co.) so the full flow works immediately. **Reset demo workspace** in the sidebar restores it.

### AI engine

Without an API key, every workflow runs on a deterministic local engine (rules and parsers in `src/lib/engine/`), so the demo never depends on network access. To use an LLM, create `.env.local`:

```bash
cp .env.example .env.local
# then set OPENAI_API_KEY or ANTHROPIC_API_KEY
```

| Variable | Default | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | — | Uses `gpt-5.4-mini` unless `AI_MODEL` is set. |
| `ANTHROPIC_API_KEY` | — | Uses `claude-sonnet-5-5` unless `AI_MODEL` is set. |
| `AI_PROVIDER` | auto | `openai` or `anthropic` when both keys are present. |
| `AI_MODEL` | per provider | Any model id the provider supports. |
| `JEV_API_KEY` | — | Enables the Jev decision layer (below). |
| `JEV_MODEL` | `jev-latest` | Jev model id. |

The sidebar shows which engine is active. If an LLM call fails, the route falls back to the local engine and the result is stamped with a warning. Add `?engine=local` to any `/api/ai/*` call to force the local engine.

### Decision layer (Jev)

With `JEV_API_KEY` set, the classification and scoring judgments go to [Jev](https://typesafe.ai), a structured decision model that returns calibrated probabilities instead of free text (`src/lib/ai/decisions.ts`):

| Decision | Question type | Applied when |
| --- | --- | --- |
| Radar step mode (automate / assist / human) | choice | confidence ≥ 0.55 |
| Opportunity AI fit, data readiness, risk, effort, measurement | 5-level score | confidence ≥ 0.45 |
| Review comment topic and direction | choice | confidence ≥ 0.5 |
| Workflow Learning stage of free-text events | choice | confidence ≥ 0.5 |
| Interviewed task mode (automate / assist / human) | choice | confidence ≥ 0.55 |

Counts, hours, impact, and frequency stay in code. Below the threshold, the rule-based label is kept and the item is flagged for a team check; the UI shows each decision's confidence and probabilities. If Jev fails, everything falls back to the rules with a warning. Add `?decisions=rules` to an `/api/ai/*` call to skip Jev.

## Architecture

- **Next.js 16** (App Router), React 19, Tailwind v4, TypeScript.
- **AI SDK v7** structured output: `generateText` + `Output.object` with the zod schemas in `src/lib/schemas.ts`. The same schemas type the local engines, so both paths return identical shapes.
- `POST /api/ai/[task]` (`radar`, `review`, `launch`, `studio`) validates input with zod and returns `{ result, engine, warning }`. `GET /api/status` reports the active engine.
- Workspace state (evidence, brand kit, decisions, approvals, activity log) persists in the browser via zustand. No database is needed for the demo.
- Scoring is transparent and lives in `src/lib/scoring.ts`: impact 25%, frequency 15%, AI fit 15%, data readiness 10%, risk 15% (inverted), effort 10% (inverted), measurement 10%.
- Interaction design follows [Emil Kowalski's skills](https://github.com/emilkowalski/skills): custom ease-out curves, press feedback, staggered entrances, no animating from `scale(0)`, and full `prefers-reduced-motion` support. UI primitives come from Base UI and Sonner.

```
src/
  app/                 routes + API (api/ai/[task], api/status)
  components/          app shell, UI kit, one folder per workflow
  lib/
    engine/            local engines: radar, review, launch, studio
    ai/                provider resolution + prompts
    schemas.ts         zod contracts shared by LLM and local engines
    scoring.ts         opportunity scoring + hour split
    brandcheck.ts      deterministic brand rules
    seed.ts            synthetic demo workspace
```

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit
```
