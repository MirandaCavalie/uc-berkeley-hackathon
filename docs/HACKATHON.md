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
- [ ] Run 2–3 user interviews with enterprise marketers and add the quotes to the pitch
- [ ] Optional: add an API key in `.env.local` and rehearse once with the LLM engine
- [ ] Rehearse the 3-minute live demo twice, timed

## Thesis (one paragraph)

> Enterprise marketing teams are adopting AI before they know which part of their workflow actually deserves it, so tools get bolted onto the creative work while the real time sinks — reconciling feedback from Slack, email, and Figma, re-adapting one idea into a dozen channel specs, checking every line against a brand book — stay manual. CreativeOps Radar is an evidence-first AI partner for creative teams: it reads the artifacts a campaign already produces, reconstructs the real process, and shows which steps AI should automate, which it should assist, and which must stay human and creative, with every claim traced to a verbatim quote and no invented numbers. It then runs the top opportunity — starting with the creative feedback and revision loop — as a pilot with a human gate before anything ships, and measures it against the team's own baseline. The result is less busywork, fewer revision rounds, and more of the team's time spent on the work only people can do.

## Rubric mapping

| Criterion | Weight | Where we score |
| --- | --- | --- |
| Problem / Insight | 20% | The insight is *where* AI belongs, not *whether*. Radar quantifies the split (automate 28% / assist 28% / keep creative 44% on the sample) from evidence, not opinions. Pain points come from our research: fragmented feedback, re-adapting assets across channels, brand books that are hard to apply with AI. |
| Product & Demo | 25% | One continuous story: discover → decide → pilot → measure. Four working workflows on a shared brand kit, all clickable live. |
| Technical Execution | 20% | Typed zod contracts shared by the LLM path (AI SDK v7 structured output) and deterministic local engines; verbatim-quote verification; deterministic brand checker; transparent weighted scoring; graceful LLM fallback. |
| Market / Venture | 20% | Wedge: the creative feedback and revision loop (fast, measurable, low risk). Expansion: channel adaptation, brand compliance, creative exploration. Buyer: marketing ops / creative ops leads at enterprises. Land with a 2-week pilot measured against the team's own timeline. |
| Team & Pitch | 15% | Lead with a real reviewer story from interviews; keep the demo to one narrative thread. |

## 3-minute demo script

Start on **Overview** after clicking **Reset demo workspace**.

**0:00 – 0:25 · The problem.** "Marketing teams are told to use AI everywhere. But the part that eats their week isn't the idea. It's 31 comments across Slack, email, and Figma, and twelve resized versions of the same ad. And when AI touches the creative itself, the work gets generic. We built CreativeOps Radar to find where AI actually belongs."

**0:25 – 0:45 · Interviews + Learning.** Open **Interviews**. "Discovery usually takes consultants months. Here, 7 of 8 people answered an 8-minute async AI interview in 4 days." Point at *424 hours/month mapped across 22 tasks* and the top finding, **Channel adaptation & resizing**, with Nina's quote and her "keep human" line about hero crops. Click **Send to Radar**. Then flash **Learning**: "We also learn the path from what the team already produces," showing the review loop repeated 2×.

**0:45 – 1:05 · Radar (discover).** Open **Radar** and click **Run Radar**. Confirm one step in **Team check** to show corrections become rules. Point at the evidence: a brief, feedback threads, an approval timeline, a request queue, and results. "Radar reconstructs the real process from what the team already produced." Show the split bar: *56% of hours are work AI can take or assist; 44% stays with people.* Click a process step and show the verified quote. Open the top opportunity (**Creative feedback & revision loop, 84**): what AI takes, what people keep, and the score breakdown. "No made-up ROI: every number traces back to their own timeline."

**1:05 – 1:55 · Review Loop (pilot).** Click through to **Review Loop** and **Consolidate feedback**. "17 comments, 6 reviewers, 3 channels." Show the dark banner: *the one decision blocking this round* has a named owner. Show the brand-book conflict: the AI catches that "warm it up" contradicts the guidelines. "AI never picks a side." Choose **Go with Priya — keep as is**, approve the legal theme, then **Approve brief**. Point at the pilot metric: baseline consolidation *3 days* vs this round in *seconds*.

**1:55 – 2:30 · Campaign Launch.** **Generate channel matrix**: seven channels, each with specs and character counts. Edit a headline to "The warmest jacket we've ever made" and watch it get **blocked**. Click **Apply approved claims** and approve. "Brand rules run as code, not as a prompt."

**2:30 – 2:50 · Creative Studio.** **Explore territories**: safe, stretch, and bold, all built from the brand palette. "This is where AI expands creativity instead of replacing it. The team chooses."

**2:50 – 3:00 · Close.** "Radar finds the busywork, pilots take it off the team's plate, and the creative work stays creative. We start with the revision loop: a 2-week pilot measured against your own baseline."

**Backup:** if anything fails live, reload the page; state persists in the browser. The local engine needs no network.

## User interview guide (2–3 interviews, 20 min each)

Target: marketing managers, creative ops, brand, or design leads at companies with 20+ person marketing teams.

1. Walk me through the last campaign from brief to launch. Where did it stall?
2. How does feedback reach the designer today? How many rounds did the last asset take?
3. How many channel versions does one idea turn into? Who resizes and rewrites them?
4. How do you check work against the brand book? What slips through?
5. Where have you tried AI? What felt useful, and what felt like it made the work worse?
6. If a tool cut one revision round per campaign, what would that be worth? Who would buy it?

Capture verbatim quotes. They go straight into the Problem/Insight slide.

## Source material

- Value proposition: *CreativeOps Radar* (evidence-first discovery, 7-dimension scoring, feedback-loop wedge, no invented savings, no auto-publishing).
- Team notes: enterprise marketing focus, three demo workflows on a shared base platform, AI expands creativity rather than replacing it; references, colors, and client inputs organized in one place.
