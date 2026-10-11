# SOP: Fieldwork employee research and personalized workspace

## Qué hace

Fieldwork invites employees to individual workflow conversations, saves their progress, and captures how their repeated work actually happens. The research owner and authorized team leads can review submitted transcripts, exact source quotes, missing evidence and time estimates. Approved records can feed the existing company work map and personalized workspace.

The real flow is `/research` → private email invitation → `/interview` → employee review → submitted evidence. The older `/discovery` interview panel and Northwind data remain a separate demo; its browser-only invitations do not send email.

## Por qué se construyó así (build/buy/kill)

Build the adaptive interview and evidence review because they are the requested product and must connect employee examples, corrections, human boundaries and the work map. Integrate SMTP through Nodemailer instead of building an email service; use SQLite transactions for the confirmed 25–100-person pilot on a persistent Node server. This extends the existing app without adding a separate orchestration service. OpenAI handles extraction and question generation; exact quote checks, access, lifecycle, time arithmetic and exports remain application code. Jev remains available to the legacy work-map decision engine.

Decision rubric (5 = stronger reason to build): specificity 5, pilot volume/urgency 3, cost of buying unknown (no vendor quote obtained), time to value 4 because the UI and work-map engine already exist, maintenance 3 because the owner must monitor interviews, models and delivery. This is a build decision based on the requested product and existing investment, not a claim that a purchased survey tool could never work. At 10× volume, reassess managed Postgres, organization SSO, an invitation queue, per-organization budgets and managed email delivery; SQLite on one persistent host is not a horizontally scaled SaaS architecture.

Diagnosis: volume is 25–100 pilot employees; input channel is SMTP/Gmail invitations leading to browser text conversations; input format is unstructured employee answers; destination is a cited workflow record and reviewed work map; employees explicitly submit and the owner chooses to import; erroneous time or workflow interpretations can misdirect investment, so outputs are reported evidence and estimates rather than automatic decisions. No real employee edge cases have been supplied. Tests use explicitly synthetic normal, ambiguous-time, invented-citation, contradictory, interrupted and concurrent cases. Before broad rollout, review 2–3 real anonymized interviews, including a routine case and a difficult exception.

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

### Live research setup

1. Use Node 22.13+ and run `npm install`, then `npm run dev`.
2. Open `http://localhost:3000/research`. On the local development server only, create the owner password (at least 12 characters). The password is salted and hashed in the private database. For production, configure `FIELDWORK_ADMIN_PASSWORD` privately instead. This environment password overrides the database password.
3. Edit the ignored `.env.local` privately. Set a new, unexposed `OPENAI_API_KEY`; optionally choose `OPENAI_INTERVIEW_MODEL` (default: the existing project convention, `gpt-5.4-mini`). Do not reuse a key pasted into chat. The key must have access to the Responses API and model, with billing available. `store: false` is used for model responses; this is not a claim about all provider-side retention.
4. For Gmail, configure `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER` and `SMTP_FROM` as the sending address, and `SMTP_PASSWORD` as a Google app password. Gmail app-password availability depends on the account's security/organization policy. Other SMTP providers work with their host and credentials; non-465 ports require STARTTLS. Credentials stay on the server. No inbox reading permission is needed. Email replies are directed to the research owner, not ingested by the AI.
5. Restart the server after environment changes. The readiness panel reports configuration presence, not a successful live request.
6. Set company name, research purpose, owner contact and retention in `/research`. Existing invitations retain their original scope and retention; edits affect new invitations.
7. Deploy using `npm run build` followed by `npm start` on a persistent Node host behind HTTPS. Set `FIELDWORK_PUBLIC_URL` to the public HTTPS origin and `FIELDWORK_DB_PATH` to a private persistent volume path. Do not expose the Next development server to employees. Do not put the database in `public/`, an ephemeral serverless filesystem or shared network storage.
8. Create an invitation for a pilot recipient. Review its text and destination. Copy the private link or choose **Send invitation email**. The send button requires model, SMTP and public URL configuration. Test first with an address the owner controls; verify both SMTP acceptance and actual inbox arrival. No email was sent during automated verification.
9. The employee opens the link, reads the participation scope, accepts, answers, reviews cited facts and numerical estimates, submits or declines. Closing the tab pauses the interview. The same private link resumes it until expiration. A model failure leaves the last committed record intact and the unsent answer in the text box.
10. Refresh the research dashboard. Draft content is hidden there. View submitted evidence and download JSON. Use **Use evidence-ready records in work map** only after reviewing it; this explicitly saves a copy in the current browser and replaces demo records. Export requires completed evidence checks and usable time estimates. Partial interviews remain available for human review but are excluded from quantitative planning.
11. Create a team lead link with the exact team name. Share it only with the intended lead. It grants access to submitted records for that team, expires after seven days, and produces a one-day browser session. **Revoke access for the selected team** invalidates all its links and browser sessions. The owner sees all teams. This is scoped bearer-link access, not verified employee SSO; a forwarded link gives the recipient its access.
12. Run `npm run check:discovery`, `npm run lint`, `npx tsc --noEmit`, `npm run check:demo`, `npm run check:roi`, `npm run build`, then `npm run check:discovery:http`. The last command starts and removes an isolated production test server and database. Synthetic model stubs verify graph execution; they do not establish real model interview quality.

## Entradas y salidas

- Entrada: company context, team populations, employee name/role/team, the current graph checkpoint, and a free-text answer. The browser sends the full bounded session state to `POST /api/interview/next`; Jev receives only the routing evidence and allowed transitions.
- Salida: a resumable `Interview` record with consent scope, transcript, structured tasks, hours, tools, friction, waits, AI use, human boundaries, satisfaction, last route, and executed node trace; company opportunities and ROI estimates; one report and 90-day roadmap per completed employee; saved personal helper recipes and employee feedback; and optional model-generated work briefs.

For the live flow, `/api/discovery/session` accepts only a private token, action, version, request ID and answer. The server loads authoritative session state rather than trusting a browser-supplied transcript. Each model role receives only that employee's interview context, never another employee's record. The evidence analyst produces up to three workflows containing trigger, input channels/formats, manual steps, destination, tools, handoffs, volume, active time, exceptions, approval rules, error cost, workarounds, a real example and human boundaries. The auditor verifies quote membership and flags gaps; the interviewer asks a context-specific follow-up. The graph has no tools to contact people or operate company systems.

## Casos límite conocidos

- Short friction answers trigger a concrete-example follow-up.
- A new interview cannot start until the participant accepts the collection scope; records without that status stay in review.
- Unrecognized task language remains in `Other` until a person or Jev classifies it.
- A workspace without team populations infers a proportional roster from the people already invited.
- The coverage planner is a practical discovery estimate, not a formal research-power calculation for regulated studies.
- In the legacy demo, if `JEV_API_KEY` is absent or Jev times out, its graph uses the local evidence guardrail. The live research system instead uses the OpenAI interviewer and returns an explicit error when unavailable; it never silently substitutes canned responses. SMTP and durable server storage are implemented. Audio, employee SSO, inbox-reply interviewing and a background invitation queue are not implemented.
- If `OPENAI_API_KEY` is absent, the personal helper returns a local work brief. The employee report, roadmap, calculations, and helper configuration remain fully available.
- Existing browser data may predate a workspace-data correction. Use “Restore workspace” to reload deterministic task IDs and consent records.
- Capacity is estimated from employee-reported time, capture rates, adoption assumptions, and loaded cost. It is not guaranteed cash savings.
- “30 minutes per invoice, 20 invoices/week” becomes 10 active hours/week. Daily volume requires the employee's working-day count; missing counts stay unknown. Monthly amounts use 4.33 weeks/month. Waiting is recorded separately. Time extraction is still a model interpretation: employees must confirm it, and overlapping tasks require human review.
- Exact quote validation prevents nonexistent citations, but does not prove that the model interpreted the quote correctly. The model can still ask weak questions or misinterpret a real quote. Employee review and a real pilot evaluation remain necessary.
- Successful turns use version checks, expiring database leases and persisted request IDs. Duplicate retries do not duplicate committed answers. A crashed or timed-out turn releases its lease immediately on handled failure, or after 150 seconds if the process dies. The client should refresh before retrying a stale version.
- The normal conversation is bounded to 30 employee turns, with up to 10 extra correction turns. A participant can finish early or decline; declining clears answer content. Partial submissions are shown with their missing evidence and never silently counted as complete research.
- Invitation links expire after 14 days. Replacement links invalidate earlier links atomically without erasing the interview. Revoking an interview disables the link and removes it from lead views; it does not immediately physically erase the research owner's stored record or copies already downloaded/imported.
- SMTP acceptance does not prove delivery. An interrupted SMTP attempt remains `sending` or `uncertain`; inspect sender logs before explicitly making a replacement link. There is no automatic resend that could duplicate invitations.
- The live database supports independent sessions on one persistent host. No load test of 100 simultaneous model conversations has been performed. Confirm provider throughput and spend limits before a large invite wave.

## Umbral de aprobación humana

The employee reviews and submits their interview before it enters the roadmap. Every personal recommendation shows a human checkpoint from the process blueprint or the employee's stated boundary. Model outputs are drafts only; saving a helper or executing an external action requires employee review. Jev judgments below their confidence thresholds keep the rule-based result and are flagged for human review.

Live research requires employee consent before the first answer and explicit review confirmation before submission. The owner initiates each invitation send and work-map import. Team leads can only view/export their own team's submitted records. Neither model can change access, send email, approve an automation, or judge employee performance. Incomplete evidence, contradiction flags or unknown numeric estimates block work-map import. A complete record is still employee-reported evidence, not an independently validated business case.

## Mantenimiento

Review interview prompts, parsers, and the shared graph manifest when teams use new vocabulary, tools, or work patterns. Any node change must update both `src/lib/ai/interview-graph.ts` and its shared metadata in `src/lib/engine/interview-agent.ts`. Run the two graph route checks plus `npm run check:demo`, `npm run check:roi`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` before presenting. Update connectors separately when identity, consent, token storage, or delivery requirements change.

The live graph is `src/lib/discovery/agent.ts`; schema, exact-quote auditing, database, access, SMTP and export code live beside it. Run the discovery tests when changing any of those contracts. Review several anonymized transcripts after changing the model or instructions. Track question repetition, incorrect facts, missing exceptions, unit mistakes and employee corrections; deterministic tests alone do not measure interview quality.

The research owner operates account access, invitations, consent, retention and withdrawal requests. The application maintainer operates the Node host, API/SMTP credentials, backups and schema changes. Database permissions are restricted and bearer tokens are stored hashed. The database is not application-encrypted; use an encrypted host volume and protect backups. Back up SQLite with its backup facility, or stop the app before copying the database and WAL files; verify a restore on a separate installation. Do not copy a live database file alone and assume it is consistent.

Expired research records are logically deleted on the next participant lookup, invitation creation or dashboard listing according to each invitation's original retention policy. On an idle installation, arrange a scheduled authenticated check or maintenance process if strict deletion timing is required. Copies downloaded or imported into browser storage and backups need separate retention handling. Existing AI helper and Jev endpoints require research authentication in production; development demo behavior remains unchanged.

Deployment is not complete until a private replacement API key, SMTP credentials, public HTTPS host and owner account are configured and a real pilot interview plus email delivery test passes. No production deployment, account connection, real employee interview or live model evaluation was performed by the automated tests.

Implementation references: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Node SQLite](https://nodejs.org/api/sqlite.html), [Nodemailer SMTP](https://nodemailer.com/smtp), and [Google app-password requirements](https://support.google.com/accounts/answer/185833). OAuth is a future alternative when organization policy does not permit SMTP app passwords.
