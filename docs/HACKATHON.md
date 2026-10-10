# Innovation Intelligence Hackathon — tracking

UC Berkeley · Oct 5–11, 2026 · **AI-Native Enterprise** track

## Deadlines

| When | What |
| --- | --- |
| **Sat Oct 10, 11:59 PM** | Submissions close: repo, demo video, one-paragraph thesis |
| **Sun Oct 11** | Demo Day: 3-minute live demo |

## Submission checklist

- [x] Product built during build week (existing tools, open source, and AI assistants allowed)
- [x] Public-ready repo with README and run instructions
- [x] Works offline with no API key (local engine), so the live demo can't break on Wi-Fi
- [x] Synthetic data clearly labeled in the UI
- [ ] Push the repo to a shared remote and add teammates
- [ ] Record the demo video (follow the script below; judges weigh the demo heavily)
- [ ] Paste the thesis paragraph into the submission form
- [ ] Run 2–3 designer interviews (Gary's action item) and add the quotes to the pitch
- [ ] Optional: add an API key in `.env.local` and rehearse once with the LLM engine
- [ ] Rehearse the 3-minute live demo twice, timed

## Thesis (one paragraph)

> In-house brand teams don't lose time on the idea; they lose it in the feedback loop. One hero asset collects 30+ comments across Slack, email, and Figma, a design lead reconciles them by hand, reviewers contradict each other and the brand book, and every unresolved conflict becomes another revision round: 18 days from first review to final revision in our sample. AI can't replace the designer (it gets to a B+, and brands need the A+), but it can take the busywork around the design. CreativeOps Radar's Review Loop consolidates a round in minutes: it groups and de-duplicates comments, catches conflicts with other reviewers and the brand book, names who has to decide, and writes a revision brief that only fills with human-approved changes. The product captures its own baseline through short async AI interviews with the creative team and measures every round against it. The result is fewer revision rounds, hours back to the design team every month, and designers who keep every design decision.

## Rubric mapping

| Criterion | Weight | Where we score |
| --- | --- | --- |
| Problem / Insight | 20% | AI shouldn't replace designers (B+ vs. A+); it should remove the busywork around them. The feedback loop is the sharpest version: 18 days, 2 rounds, 49 comments reconciled by hand in the sample, plus designer interview quotes. |
| Product & Demo | 25% | One story: the loop today → consolidate a round → measure it. Review Loop with a live before/after panel; Interviews supply the baseline. Everything else sits in Labs. |
| Technical Execution | 20% | Typed zod contracts shared by the LLM path (AI SDK v7 structured output) and deterministic local engines; verbatim-quote verification; deterministic brand checker; transparent weighted scoring; graceful LLM fallback. |
| Market / Venture | 20% | Customer: in-house brand and marketing teams that own a brand book and ship campaigns on repeat (agencies later). Wedge: the creative review loop, where value is measurable in two weeks. Expansion (Labs): channel adaptation, brand compliance, workflow discovery. Buyer: creative ops / brand lead. |
| Team & Pitch | 15% | Lead with a real reviewer story from interviews; keep the demo to one narrative thread. |

## 3-minute demo script

Start on **Overview** after clicking **Reset demo workspace**.

**0:00 – 0:30 · The problem (Overview).** "AI won't replace designers. It gets to a B+, and brands need the A+. But designers lose their week to the loop around the design." Point at the hero: *18 days from first review to final revision, 2 rounds, 49 comments reconciled by hand.* Read Alex's quote: "I reconcile 30+ comments by hand every round and half of them contradict each other."

**0:30 – 1:00 · The baseline (Interviews).** "We got that from the team itself: an 8-minute async AI interview." Show *7 of 8 interviewed* and the **Feedback loop** card: 2.8 rounds per asset, 26 hours a month consolidating, two people waiting on feedback. "Every number on screen comes from their timeline or their own words."

**1:00 – 2:20 · The product (Review Loop).** Open **Review Loop**, point at the **Today** column, then click **Consolidate feedback**. "17 comments, 6 reviewers, 3 channels, in one pass." Show the blocking decision with its owner, then the brand-book conflict: "warm it up" contradicts the guidelines. "AI never picks a side." Choose **Go with Priya — keep as is**, approve the legal theme, **Approve brief**. Point at the **With Review Loop** column: consolidated in seconds vs 3 days, ~21 hours a month back, conflicts decided before revision. "Designers keep the design."

**2:20 – 2:45 · Where it goes (Labs).** Flash **Radar** in one sentence: "The same evidence maps the rest of the workflow, so after the review loop we know what to take on next."

**2:45 – 3:00 · Close.** "For in-house brand teams: fewer revision rounds, hours back every month, and every design decision stays human. We start with a 2-week pilot on one campaign, measured against the team's own baseline."

**Backup:** if anything fails live, reload the page; state persists in the browser. The local engine needs no network.

## Designer interview guide (2–3 interviews, 20 min each)

Target: designers and design leads on in-house brand teams. The same questions are in the app (**Interviews → Copy designer guide**); type answers into an interview to add them to the findings and the Review Loop baseline.

1. What's your part in a typical campaign?
2. Which tasks do you repeat every campaign? For each: hours a week, tools, what makes it slow.
3. How many feedback rounds does a typical asset go through before it's approved?
4. When a round of feedback comes in, how long does it take to turn it into one clear list of changes?
5. Tell me about the last time two reviewers, or a reviewer and the brand book, disagreed. What happened?
6. Where does your work wait on someone else?
7. Which part of your work should never be automated?
8. If one revision round per campaign disappeared, what would you do with that time? Who would pay for that?

Capture verbatim quotes. They go straight into the Problem/Insight slide.

## Source material

- Value proposition: *CreativeOps Radar* (evidence-first discovery, 7-dimension scoring, feedback-loop wedge, no invented savings, no auto-publishing).
- Team notes: enterprise marketing focus, three demo workflows on a shared base platform, AI expands creativity rather than replacing it; references, colors, and client inputs organized in one place.
