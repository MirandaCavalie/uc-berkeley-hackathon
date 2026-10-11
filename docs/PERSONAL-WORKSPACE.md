# My work — personal AI workspace

`/my-work` turns one employee's interview into a personal starting point for AI:
a recommendation grounded in their own tasks, a guided five-step builder for a
reusable **Prepare my meeting** skill, and a place to record whether it helped.

## The five steps

1. **Your task** — confirm the interview task this helper supports and the goal.
2. **A good result** — choose brief sections and write instructions, like briefing a colleague.
3. **Your context** — sample meeting, manual entry, or a Google Calendar event; add company context and notes.
4. **Test & improve** — run it, review the brief and the exact context sent. Any edit invalidates the test.
5. **Save & use** — name the skill; it appears in **My helpers** and its runs in **My progress**.

Concepts are taught in place: **skill** (reusable instructions you run), **automation**
(the same recipe on a trigger or schedule — next step), **agent** (chooses steps and tools
within permissions — next step).

## Runs without any setup

- No `OPENAI_API_KEY`: the helper returns a **template worksheet**, labelled as not AI-generated.
- No Google credentials: use the sample meeting or enter details manually.
- Helpers, drafts, runs and feedback are stored in the browser (zustand persist), like interviews.

## Enable AI briefs

Set `OPENAI_API_KEY` in `.env.local` (optionally `OPENAI_MEETING_MODEL`). The route
`POST /api/helpers/meeting` calls the Responses API with a strict JSON schema, treats
meeting text and notes as untrusted evidence, and never invents decisions or commitments.

## Enable Google Calendar (read-only)

1. In Google Cloud Console, create a project and enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External, Testing) and add your Google account as a test user.
3. Create an **OAuth client ID** → Web application. Authorized redirect URI:
   `http://localhost:3000/api/integrations/google/callback`
4. Put the client ID and secret in `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   (and `GOOGLE_REDIRECT_URI` if you use another origin). Never commit them.
5. Restart `npm run dev`, open Fieldwork at exactly the redirect origin (`localhost`, not `127.0.0.1`),
   and choose **Google Calendar** in step 3.

Scope is `calendar.events.readonly`, with PKCE and a state cookie. Tokens live only in server
memory for up to 8 hours; restarting the dev server disconnects. This is a local-demo design,
not production token storage.

## Limits of this version

No scheduling, no sending follow-ups, no other connectors yet. Time saved is self-reported,
not measured ROI.
