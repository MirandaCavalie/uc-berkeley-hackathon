# Fieldwork interface design

## Direction

Fieldwork should feel like a calm research instrument: quiet surfaces, clear hierarchy, and evidence close to the decision it supports. The interface should help a company move through three questions:

1. Who have we heard from, and is the sample balanced?
2. What work did people describe, with what evidence?
3. Which opportunities deserve a human decision next?

## Brand

- **Name:** Fieldwork. It describes going to the place where work happens and asking the people doing it.
- **Primary purple:** `#6D45D9`. Used for agent actions, active navigation, progress, and the Fieldwork mark.
- **Deep purple:** `#5432B1`. Used for hover states and pressed actions.
- **Purple wash:** `#EFE9FC`. Used behind agent status and selected evidence.
- **Signal amber:** `#E9A23B`. Used sparingly for findings, attention, and the logo dot.
- **Paper:** `#F4F2EC`. The workspace background.
- **Ink:** `#13140F`. Body text and high-contrast controls.

Purple is the product identity. Status colors keep their meaning: green means a completed or healthy state, amber means attention, red means risk, and pink means a human boundary.

## Type

Geist is the product typeface. Body copy stays regular and readable. Display text uses a lighter semibold treatment with tight tracking rather than italics or decorative effects. Headings are short; supporting copy should explain one idea in one or two sentences.

## Layout

- Keep the primary action in the page header.
- Use one dominant card per decision area instead of a wall of equal cards.
- Use a two-column layout for system status and the next action; collapse it to one column on small screens.
- Prefer progressive disclosure for transcripts, task evidence, and scoring details.
- Show the employee quote next to the derived task or recommendation whenever possible.

## Discovery experience

Discovery opens with the interview system: sample the teams, run parallel employee agents, capture evidence, and review the roadmap. The node graph makes the orchestration legible: a research lead creates the wave, isolated sessions talk to employees, the evidence layer preserves quotes, and the company layer finds patterns before Jev ranks opportunities. The sample plan shows the target per team and remaining coverage. The People list is the operational handoff: each person can start or continue the agent, or view their completed record.

## Interaction rules

- Buttons say what will happen: “Start agent”, “Continue agent”, “View record”, “Copy next invite brief”.
- A loading state explains which system is working.
- The employee can correct the record before submission.
- No confidence score appears without the evidence or rule that produced it.
- Avoid long blocks of marketing copy inside the product workflow.
