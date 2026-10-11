# Fieldwork interface system

Fieldwork is a calm research instrument for finding where work gets stuck. The interface should feel precise and useful before it feels impressive: one clear action, short explanations, and evidence beside every decision.

## Brand

**Name:** Fieldwork

**Promise:** Make work visible. Make AI useful.

**Position:** Fieldwork listens to the people doing the work, finds the friction between teams, and turns it into a defensible AI roadmap.

The mark uses four field lines and an apricot signal point. The lines represent work mapped across teams; the point is the finding worth acting on. The mark is implemented as a vector in `src/components/brand.tsx`, so it stays crisp in the app, favicon, Apple icon, and social card.

## Color tokens

| Token | Value | Role |
| --- | --- | --- |
| Iris | `#7161E8` | Primary action, active state, agent identity |
| Deep iris | `#5748C7` | Hover and pressed state |
| Lavender paper | `#F7F6FB` | App background |
| White | `#FFFFFF` | Cards and focused surfaces |
| Ink violet | `#19182D` | High-contrast text |
| Muted violet | `#77758A` | Supporting copy |
| Signal apricot | `#F0A563` | Findings, attention, logo point |
| Human rose | `#BD547B` | Human boundary and protected judgment |

Purple is the product identity. Green, amber, and red remain semantic status colors only. They do not compete with the brand color.

## Type and voice

Avenir Next is the product typeface, with Helvetica and Arial fallbacks. It gives the interface a familiar editorial rhythm without the geometric look common to AI products. Body text stays regular and comfortable. Display text uses medium weight and restrained tracking. No italic display treatment, decorative gradients, or all-caps paragraphs.

Write like a researcher:

- Use “hours back per month,” not “unlock productivity.”
- Use “three people reported waiting on Finance,” not “cross-functional friction exists.”
- Use short labels: “Evidence,” “Quality,” “Review,” “Owner.”
- Keep supporting copy to one or two sentences. Put detail behind an expansion or a linked record.

## Layout rules

- One primary action per screen.
- One dominant card per decision area.
- Use the page header for the action; do not repeat it in every card.
- Use whitespace to group information before adding borders.
- Keep the evidence quote near the derived task, score, or recommendation.
- Prefer a compact summary row followed by progressive detail.
- On mobile, stack the workflow stages and keep the selected stage detail directly below them.

## Product surfaces

### Landing

The landing page has one promise, one product conversation, and one workspace action above the fold. The lower sections explain the three-step path, the four possible recommendations, and the one-week engagement in short cards.

### Discovery

Discovery opens with the working interview agent and a team-based coverage plan. The agent card names the real runtime, router, and checkpoint behavior. The interactive architecture is generated from the same manifest as the server-side LangGraph: capture answer, update work record, check evidence, branch to follow-up or advance, ask the next question, and save the turn. Selecting a node reveals its input, output, and control rule. A separate compact row shows the employee-facing interview phases.

Completed research is organized into a single ranked Work patterns table. Rows expand to show the employee evidence behind a process. Adoption readiness summarizes employee experiments, policy constraints, and non-adoption without presenting a wall of quotes. The People table remains the operational handoff for starting, continuing, or reviewing interviews.

### Opportunities

The first visual question is “what kind of decision is this?” The solution mix answers it before the ranked list. Each expanded opportunity keeps readiness, source quotes, the blueprint, and the human checkpoint together.

### Roadmap

The top card states the outcome and its source. Three phases organize the work. “Kept human” has equal visual weight so the product never implies that every task should be automated.

### Dashboard

The dashboard is the first engagement surface. It opens with three direct metrics: invested to date, value created, and net return. The live-initiatives table uses five columns and puts the decision in the final column; hovering the badge explains both the decision and the evidence behind it. Next investments show net value, time saved, and payback first. Cost, range, assumptions, and methodology use disclosure controls so they remain available without competing with the decision.

### My work

My work is the employee-facing handoff. It starts with a complete personal report, filters the company opportunity map down to that employee’s tasks, and turns it into a 90-day roadmap. The helper builder starts from a selected roadmap task and keeps the interview evidence, company context, source, metric, and human checkpoint together. Progress records usefulness and self-reported time saved after each run.

## Motion

Motion is functional: short enter transitions, progress bars that reveal status, and press feedback on controls. Respect `prefers-reduced-motion`. Do not animate decorative gradients or make the brand mark spin.

## Accessibility

Use visible focus states, semantic headings, labels for form controls, readable contrast, and text alongside status color. The graph status must be understandable from its label, not only its color. The interview must work with keyboard input and screen readers.

## Implementation map

- Tokens and motion: `src/app/globals.css`
- Mark, logo, and wordmark: `src/components/brand.tsx`
- Shared controls: `src/components/ui.tsx`
- App shell and navigation: `src/components/app-shell.tsx`
- Discovery graph: `src/components/discovery/agent-graph.tsx`
- Product landing: `src/app/(site)/page.tsx`
