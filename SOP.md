# SOP: Fieldwork discovery and personalized employee workspace

## Qué hace

Fieldwork plans a proportional sample of employees, runs adaptive interviews, audits the evidence, and turns the results into a company roadmap. Every completed participant also receives a personal work report, a 90-day AI roadmap, and a reusable helper grounded in their own interview.

## Por qué se construyó así (build/buy/kill)

Build the Fieldwork research graph and personal-profile engine because the interview questions, evidence gates, employee boundaries, and links between personal and company recommendations are product-specific. Keep calculations deterministic and use a model only to improve bounded drafts. Buy or integrate generic transport and operations later: email delivery, SSO, audio, durable storage, calendar providers, and queueing. At ten times the volume, move execution to durable workers while keeping these typed contracts.

## Cómo correrlo

1. From the project directory, run `npm ci`.
2. Start the local app with `npm run dev`.
3. Open `http://localhost:3000/discovery`.
4. Review the sample plan and copy the next invite brief.
5. Add a person under People, choose “Start agent”, accept the collection scope, answer the prompts, edit the captured record, and submit it.
6. Read the control graph. A yellow Review node means evidence, consent, or coverage still needs attention; it is not a recommendation.
7. Continue to Opportunities when the work map has enough completed interviews.
8. Open `http://localhost:3000/my-work`, select an employee, and review their Report and AI roadmap.
9. Choose “Build this helper,” test it with the safe sample or approved work context, then save it under My helpers.
10. Run `npm run check:demo`, `npm run check:roi`, `npm run lint`, and `npm run build` before changing or presenting the demo dataset.

## Entradas y salidas

- Entrada: company context, team populations, employee name/role/team, and free-text answers in the browser. When configured, each answer is sent from the server to Jev with the current interview node and safe transition candidates.
- Salida: an `Interview` record with consent scope, transcript, tasks, hours, tools, friction, waits, AI use, human boundaries, and satisfaction; a typed research graph; company opportunities and ROI estimates; one report and 90-day roadmap per completed employee; saved personal helper recipes and employee feedback; and optional model-generated work briefs.

## Casos límite conocidos

- Short friction answers trigger a concrete-example follow-up.
- A new interview cannot start until the participant accepts the collection scope; records without that status stay in review.
- Unrecognized task language remains in `Other` until a person or Jev classifies it.
- A workspace without team populations infers a proportional roster from the people already invited.
- The sample planner is a practical discovery estimate, not a formal research-power calculation for regulated studies.
- If `JEV_API_KEY` is absent, the interviewer uses local evidence guardrails and clearly reports that mode. The graph and quality audit still run deterministically. Email, SMS, audio, SSO, durable storage, and background queues are not connected yet.
- If `OPENAI_API_KEY` is absent, the personal helper returns a local work brief. The employee report, roadmap, calculations, and helper configuration remain fully available.
- Existing browser data may predate a seed-data correction. Use “Reset demo workspace” to reload deterministic task IDs and seeded consent records.
- Capacity is estimated from employee-reported time, capture rates, adoption assumptions, and loaded cost. It is not guaranteed cash savings.

## Umbral de aprobación humana

The employee reviews and submits their interview before it enters the roadmap. Every personal recommendation shows a human checkpoint from the process blueprint or the employee's stated boundary. Model outputs are drafts only; saving a helper or executing an external action requires employee review. Jev judgments below their confidence thresholds keep the rule-based result and are flagged for human review.

## Mantenimiento

Review interview prompts and parsers when teams use new vocabulary, tools, or work patterns. Run `npm run check:demo` whenever seed employees, team populations, opportunity rules, or follow-up initiatives change. Review capture, adoption, and loaded-cost assumptions before presenting value estimates. Update connectors separately when identity, consent, token storage, or delivery requirements change.
