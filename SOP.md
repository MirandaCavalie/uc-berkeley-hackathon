# SOP: Fieldwork interview discovery agent

## Qué hace

Fieldwork plans a proportional sample of employees by team, runs an adaptive interview in the browser, and turns each conversation into a reviewed record of recurring work. Those records feed the work map and the later AI roadmap.

## Por qué se construyó así (build/buy/kill)

Build a small state-machine agent for the prototype because the interview questions and evidence fields are specific to Fieldwork, the demo volume is small, and a deterministic flow is easier to validate with hackathon participants. Buy or integrate the transport layer later if the campaign grows: email delivery, SSO, consent, audio, and durable multi-tenant storage are generic capabilities. At ten times the volume, move those operational pieces to an established provider and keep the Fieldwork interview graph and evidence model.

## Cómo correrlo

1. From the project directory, run `npm ci`.
2. Start the local app with `npm run dev`.
3. Open `http://localhost:3000/discovery`.
4. Review the sample plan and copy the next invite brief.
5. Add a person under People, choose “Start agent”, answer the prompts, edit the captured record, and submit it.
6. Continue to Opportunities when the work map has enough completed interviews.

## Entradas y salidas

- Entrada: company context, team populations, employee name/role/team, and free-text answers in the browser.
- Salida: an `Interview` record with transcript, tasks, hours, tools, friction, waits, AI use, human boundaries, and satisfaction; the Discovery work map; a sample time/cost estimate; and an optional Jev judgment report.

## Casos límite conocidos

- Short friction answers trigger a concrete-example follow-up.
- Unrecognized task language remains in `Other` until a person or Jev classifies it.
- A workspace without team populations infers a proportional roster from the people already invited.
- The sample planner is a practical discovery estimate, not a formal research-power calculation for regulated studies.
- Email, SMS, audio, consent, SSO, and persistent server storage are not connected yet.

## Umbral de aprobación humana

The employee reviews and submits their interview before it enters the roadmap. Jev judgments below their configured confidence thresholds keep the rule-based result and are flagged for human review. No automation is executed from the roadmap.

## Mantenimiento

Review the interview prompts and parsers when teams begin using new vocabulary, tools, or work patterns. Review the sampling assumptions with a research lead before using the output for a formal workforce study. Update the transport integration separately when identity, consent, or delivery requirements change.
