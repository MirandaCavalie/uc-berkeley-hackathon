# SOP: Fieldwork interview discovery agent

## Qué hace

Fieldwork plans a proportional sample of employees by team, runs isolated adaptive interview sessions, audits the resulting evidence, and only then synthesizes team and company patterns for an AI roadmap.

## Por qué se construyó así (build/buy/kill)

Build the Fieldwork research graph because the interview questions, evidence gates, and human boundaries are product-specific. Keep the model inside bounded nodes: sampling, scope and consent, interviewing, evidence extraction, quality audit, team synthesis, company synthesis, and roadmap decisions. Buy or integrate generic transport and operations later: email delivery, SSO, audio, durable storage, and queueing. At ten times the volume, move execution to durable workers while keeping these typed contracts.

## Cómo correrlo

1. From the project directory, run `npm ci`.
2. Start the local app with `npm run dev`.
3. Open `http://localhost:3000/discovery`.
4. Review the sample plan and copy the next invite brief.
5. Add a person under People, choose “Start agent”, accept the collection scope, answer the prompts, edit the captured record, and submit it.
6. Read the control graph. A yellow Review node means evidence, consent, or coverage still needs attention; it is not a recommendation.
7. Continue to Opportunities when the work map has enough completed interviews.

## Entradas y salidas

- Entrada: company context, team populations, employee name/role/team, and free-text answers in the browser. When configured, each answer is sent from the server to Jev with the current interview node and safe transition candidates.
- Salida: an `Interview` record with consent scope, transcript, tasks, hours, tools, friction, waits, AI use, human boundaries, and satisfaction; a typed research graph snapshot; quality flags and follow-up counts; the Discovery work map; a sample time/cost estimate; and optional Jev judgment reports.

## Casos límite conocidos

- Short friction answers trigger a concrete-example follow-up.
- A new interview cannot start until the participant accepts the collection scope; records without that status stay in review.
- Unrecognized task language remains in `Other` until a person or Jev classifies it.
- A workspace without team populations infers a proportional roster from the people already invited.
- The sample planner is a practical discovery estimate, not a formal research-power calculation for regulated studies.
- If `JEV_API_KEY` is absent, the interviewer uses local evidence guardrails and clearly reports that mode. The graph and quality audit still run deterministically. Email, SMS, audio, SSO, durable storage, and background queues are not connected yet.

## Umbral de aprobación humana

The employee reviews and submits their interview before it enters the roadmap. Jev judgments below their configured confidence thresholds keep the rule-based result and are flagged for human review. No automation is executed from the roadmap.

## Mantenimiento

Review the interview prompts and parsers when teams begin using new vocabulary, tools, or work patterns. Review the sampling assumptions with a research lead before using the output for a formal workforce study. Update the transport integration separately when identity, consent, or delivery requirements change.
