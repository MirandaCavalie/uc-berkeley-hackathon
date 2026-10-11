# SOP: Fieldwork discovery and personalized employee workspace

## Qué hace

Fieldwork sets team-based interview coverage, runs adaptive employee interviews through an executable LangGraph, audits the evidence, and turns the results into a company roadmap. Every completed participant also receives a personal work report, a 90-day AI roadmap, and a reusable helper grounded in their own interview.

## Por qué se construyó así (build/buy/kill)

Build the Fieldwork interview graph, research contracts, and personal-profile engine because the interview sequence, evidence gates, employee boundaries, and links between personal and company recommendations are product-specific. The build case scores high on specificity and time to value: the bounded graph solves the demo workflow without buying a generic survey platform that cannot preserve Fieldwork's evidence and review rules. Keep parsing and calculations deterministic, and use Jev only for allowed routing and classification decisions. Buy or integrate generic transport and operations later: email delivery, SSO, audio, durable storage, calendar providers, and queueing. At ten times the volume, move LangGraph checkpoints from browser persistence to a database-backed worker while keeping the same typed node contracts.

## Cómo correrlo

1. From the project directory, run `npm ci`.
2. Start the local app with `npm run dev`.
3. Open `http://localhost:3000/discovery`.
4. Review Interview coverage and copy the interview plan.
5. Add a person under People, choose “Start agent”, accept the collection scope, answer the prompts, edit the captured record, and submit it.
6. In “Interview agent architecture,” select any runtime node to inspect its input, output, and control rule. The upper graph is the LangGraph executed for every answer; the lower row is the sequence the employee experiences.
7. Continue to Opportunities when the work map has enough completed interviews.
8. Open `http://localhost:3000/my-work`, select an employee, and review their Report and AI roadmap.
9. Choose “Build this helper,” test it with the practice context or approved work context, then save it under My helpers.
10. Run `npm run check:demo`, `npm run check:roi`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` before changing or presenting the workspace data.

## Entradas y salidas

- Entrada: company context, team populations, employee name/role/team, the current graph checkpoint, and a free-text answer. The browser sends the full bounded session state to `POST /api/interview/next`; Jev receives only the routing evidence and allowed transitions.
- Salida: a resumable `Interview` record with consent scope, transcript, structured tasks, hours, tools, friction, waits, AI use, human boundaries, satisfaction, last route, and executed node trace; company opportunities and ROI estimates; one report and 90-day roadmap per completed employee; saved personal helper recipes and employee feedback; and optional model-generated work briefs.

## Casos límite conocidos

- Short friction answers trigger a concrete-example follow-up.
- A new interview cannot start until the participant accepts the collection scope; records without that status stay in review.
- Unrecognized task language remains in `Other` until a person or Jev classifies it.
- A workspace without team populations infers a proportional roster from the people already invited.
- The coverage planner is a practical discovery estimate, not a formal research-power calculation for regulated studies.
- If `JEV_API_KEY` is absent or Jev times out, LangGraph uses the local evidence guardrail and continues through the same nodes. Email, SMS, audio, SSO, durable server storage, and background queues are not connected yet.
- If `OPENAI_API_KEY` is absent, the personal helper returns a local work brief. The employee report, roadmap, calculations, and helper configuration remain fully available.
- Existing browser data may predate a workspace-data correction. Use “Restore workspace” to reload deterministic task IDs and consent records.
- Capacity is estimated from employee-reported time, capture rates, adoption assumptions, and loaded cost. It is not guaranteed cash savings.

## Umbral de aprobación humana

The employee reviews and submits their interview before it enters the roadmap. Every personal recommendation shows a human checkpoint from the process blueprint or the employee's stated boundary. Model outputs are drafts only; saving a helper or executing an external action requires employee review. Jev judgments below their confidence thresholds keep the rule-based result and are flagged for human review.

## Mantenimiento

Review interview prompts, parsers, and the shared graph manifest when teams use new vocabulary, tools, or work patterns. Any node change must update both `src/lib/ai/interview-graph.ts` and its shared metadata in `src/lib/engine/interview-agent.ts`. Run the two graph route checks plus `npm run check:demo`, `npm run check:roi`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` before presenting. Update connectors separately when identity, consent, token storage, or delivery requirements change.
