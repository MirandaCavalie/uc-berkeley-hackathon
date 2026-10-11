# ROI dashboard — product spec

Route: `/dashboard` · Nav step 5 · "AI returns" · sub: "Where AI pays off"

## Why it exists

In B2B the buyer renews only if they can see the return. During AI transformation there is
noise: companies don't know where AI is producing results or where to invest next.
This page answers the buyer's three questions:

1. **How much have we invested, and what is coming back?**
2. **Where is it working?**
3. **What should we do next?**

Buyer: COO, Head of AI, transformation lead.

## Two segments on one page

### Segment A — "Today: what AI is returning" (tracking)

What is actually happening with initiatives already in pilot or production.

- **Headline row:** invested to date (build + run) · value reported to date · net return ·
  payback status · initiatives live.
- **Initiative table** (sortable), one row per tracked initiative:
  team · solution type · status · adoption (active people ÷ people covered) ·
  % runs marked useful · predicted hours/month vs reported hours/month · variance % ·
  invested · value reported · **decision badge**.
- **Decision rules** (deterministic, shown in a tooltip/legend):
  - **Too early** — fewer than `MIN_EVIDENCE` reports (default 5) or live < 30 days.
  - **Stop** — reported monthly value < monthly run cost after 60 days.
  - **Fix** — adoption < 40% OR useful rate < 60%.
  - **Scale** — reported ≥ 90% of predicted AND adoption ≥ 60%.
  - otherwise **On track**.
- **By team:** small bar view of reported value by team.
- Includes live feedback from My work helpers (`personalHelpers[].runs`:
  `feedback`, `minutesSaved`) as one initiative ("Meeting preparation skill").

### Segment B — "Forecast: where AI will return" (prediction)

Our methodology: we mapped the company and interviewed the people doing the work, so we can
forecast return by area before money is spent.

- **By area** (team, and process within team): forecast monthly hours back, monthly value,
  build cost, 12-month ROI, payback months, **low / base / high** range, evidence strength.
- **"Where to invest next":** top 3 not-yet-started opportunities by base-case 12-month net value,
  each with its assumptions and the quotes behind it.
- **Editable assumptions panel:** hourly cost, builder rate, adoption ceiling, run cost per
  solution type. Changing a value recomputes everything live (store in existing `roi` slice).
- A visible **"How we forecast"** explainer with the formula below.

## Forecast methodology (deterministic, in `src/lib/engine/roi.ts`)

For each opportunity `o` (from `opportunities.ts`):

1. **Reported hours** `H` = hours/month reported by interviewees for that process.
2. **Extrapolate to the team** when a team roster exists:
   `H_team = H × (team headcount ÷ people interviewed in that team)`, capped at 3×.
   Show "extrapolated from N of M people". If no roster, use `H` and say "sample only".
3. **Capture** `c` by solution type — reuse `defaultRoi.capture`
   (automation 0.8, agent 0.6, skill 0.4, human 0).
4. **Adoption ceiling** `a` from the adoption score (1–5): 0.40 / 0.55 / 0.70 / 0.80 / 0.90.
   **Ramp:** month 1 = 30% of ceiling, month 2 = 60%, month 3+ = 100%.
5. **Monthly hours back** (steady state) = `H_team × c × a`.
6. **Monthly value** = hours back × hourly cost (default $55).
7. **Build cost** = build hours × builder rate (default $120/h).
   Build hours from the effort score (1–5): 8 / 16 / 40 / 80 / 160.
8. **Monthly run cost** by solution type: automation $50, skill $30/person covered,
   agent $400 (defaults, editable).
9. **12-month net** = Σ(month 1..12 value with ramp) − build cost − 12 × run cost.
   **12-month ROI** = net ÷ (build cost + 12 × run cost).
   **Payback month** = first month where cumulative value ≥ cumulative cost (or "> 12").
10. **Range:** low = capture × 0.6 and adoption × 0.75; high = capture × 1.15 (max 0.95)
    and adoption × 1.1 (max 0.95).
11. **Evidence strength:** Strong (≥ 3 people reported it and Jev confidence ≥ 0.8),
    Medium (2 people or confidence ≥ 0.6), Weak (otherwise).

## Credibility rules (non-negotiable)

- Every number is labelled **Predicted**, **Reported** (employee feedback) or **Measured**
  (run logs). Never mix them in one total without saying so.
- Hours freed are **capacity**, not cash. Headline copy: "hours of capacity" with value
  "at $X/h loaded cost". Never say "savings".
- Synthetic data is labelled "Demo · simulated 90-day follow-up".
- All math deterministic and unit-testable; no LLM in the numbers.

## Demo data: simulated 90-day follow-up

Seed (in `src/lib/seed-followup.ts`) tracking data for the Northwind Freight roadmap:
the 3 quick wins + 2 "build next" initiatives are live; the rest are not started.
Design it so all decisions appear:

- Reporting & dashboards → **Scale** (beats prediction)
- Data entry & system updates → **On track**
- Status updates & follow-ups → **Fix** (low adoption, people reverted to manual)
- Customer replies & FAQs → **Scale**
- Inbox & ticket triage → **Stop** (agent run cost > reported value)
- Meeting preparation skill (live from My work) → usually **Too early**

Each live initiative: `liveSince`, `buildCost`, `monthlyRunCost`, `peopleCovered`,
`activePeople`, monthly `reports[]` of `{ month, hoursReported, usefulRate, reports }`.
Link by opportunity id/slug so it survives re-running the analysis.

## Out of scope tonight

Real integrations for measured data, cash-flow accounting, per-employee dashboards,
exporting to PDF (Print already exists on the roadmap).
