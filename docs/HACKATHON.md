# Innovation Intelligence Hackathon — tracking

UC Berkeley · Oct 5–11, 2026 · **AI-Native Enterprise** track

## Deadlines

| When | What |
| --- | --- |
| **Sat Oct 10, 11:59 PM** | Submissions close: repo, demo video, one-paragraph thesis |
| **Sun Oct 11** | Demo Day: 3-minute live demo |

## Submission checklist

- [x] Product built during build week
- [x] Repo with README and run instructions
- [x] Works without Jev (rule-based catalog), so the live demo can't break on Wi-Fi
- [x] Synthetic data labeled in the UI ("Demo")
- [ ] Push the repo and add teammates
- [ ] Record the demo video (script below)
- [ ] Paste the thesis paragraph into the submission form
- [ ] Run 2–3 real interviews with the app (Discovery → Invite → Start interview) and quote them in the pitch
- [ ] Rehearse the 3-minute demo twice, timed

## Thesis (one paragraph)

> Every company has an AI mandate and no idea where to start. Leaders guess from the top, consultants interview whoever is easiest to reach, and the employees who know exactly where the hours go are often missed. Fieldwork plans a sample across every team and sends each selected employee an eight-minute AI interview about recurring tasks, time, tools, friction, handoffs, current AI use, and what must stay human. Every answer runs through LangGraph, with Jev choosing only among safe interview routes. Jev then reads each process in the employees' own words and decides what fits: an automation, an AI skill, an agent, or nothing at all, along with feasibility, data readiness, risk, effort, and adoption. Low-confidence calls go to a person. The output is a ranked roadmap with a blueprint and human checkpoint for each initiative, and every hour traced to the person who reported it. In our Northwind Freight sample, 10 interviews across 6 teams surfaced 949 hours a month of recurring work and an 11-initiative roadmap worth about 534 hours a month, in one sitting.

## Rubric mapping

| Criterion | Weight | Where we score |
| --- | --- | --- |
| Problem / Insight | 20% | Companies fail at AI by picking the wrong tool for the work, or by not asking the people who do it. Discovery today is slow, sampled, and outdated on arrival. |
| Product & Demo | 25% | One story in three screens: plan a cross-team sample → interview employees → Jev decides what fits → roadmap. A live interview in the demo; Jev's confidence visible on every call. |
| Technical Execution | 20% | Executable LangGraph interview runtime with conditional follow-up routes and turn checkpoints; Jev routing and scoring with confidence gates and local fallback; deterministic value math; typed API contracts with zod. |
| Market / Venture | 20% | Buyer: COO, transformation lead, or Head of AI at 200–5,000-person companies. Proof of demand: Horizon sells AI-led discovery to Mercado Libre, Despegar, PwC. Wedge: the decision step (which kind of AI, with confidence), then quarterly re-interviews as the recurring product. |
| Team & Pitch | 15% | Lead with one employee quote, end with the roadmap. |

## 3-minute demo script

Click **Reset demo workspace** first.

**0:00 – 0:25 · The problem (landing page).** "Every company has an AI mandate. Nobody knows where to start. The people who know where the hours go are never asked." Scroll to **Not everything should be an agent**: "The most common mistake is the wrong tool for the work."

**0:25 – 1:15 · Discovery.** Open the demo. "We interviewed Northwind Freight, a 640-person logistics company: 10 people, 6 teams, in 4 days." Point at the **Work map**: Customer Support spends 152 hours a month answering the same shipment questions. Open **Dana Okafor** (View): show the probe. She said "Quantities never match," and the interviewer asked for the last time it happened. Point at **AI already in use**: 7 of 10 already use AI on their own.

**1:15 – 2:05 · Decision.** Click **Decide where AI fits**. "Jev made 78 decisions in under a second." Point at the solution mix. Open **Customer replies & FAQs**: AI skill, with confidence; the readiness bars; the quotes behind it; the blueprint with its human checkpoint. Then **Scheduling & coordination**: "The rules said automation; Jev said agent, at 99%, because every booking means juggling capacity, calendars, and calls." Show **Negotiation & relationships**: kept human, because five people said so.

**2:05 – 2:30 · Roadmap.** "11 initiatives, 534 hours a month back, starting with 3 quick wins this month." Point at the three columns, then **Kept human**.

**2:30 – 2:50 · Dashboard.** Open **Dashboard**. Start with invested, value created, and net return. Point at the live-initiatives table: **Reporting & dashboards** → Scale; **Status updates & follow-ups** → Fix; **Inbox & ticket triage** → Stop. Hover each decision to show the rule and the initiative-specific reason. Then open **Next investments**: Scheduling & coordination leads on 12-month net value. Expand “View estimate” only if the judges ask about cost, range, or evidence.

**2:50 – 3:00 · Close.** "One week from kickoff to roadmap. In 90 days, the same people answer again, and we measure what actually came back."

**Backup:** if Jev or Wi-Fi fails, the app shows rule-based estimates and says so. State persists in the browser.

## Interview guide (for live interviews)

The same questions are in the app: **Discovery → Copy interview guide**. Type the answers into an interview so they count.

1. What's your role, and what does a normal week look like?
2. Which tasks do you repeat every week? (up to five)
3. For each task: about how long does it take in a typical week, and which tools do you use?
4. For each task: what makes it slow or frustrating? Ask for the last time it happened.
5. Where does your work wait on someone or something else?
6. Do you use any AI tools today, even informally? For what?
7. Which part of your job should stay human, no matter how good AI gets?

## Source material

- Gary's feedback: focus on one tangible, testable demo; keep human judgment; show clear value.
- Reference: [Horizon](https://usehorizon.ai/), AI-powered continuous discovery: talks to employees, maps processes, ranks quick wins.
