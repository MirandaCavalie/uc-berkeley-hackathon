# Fieldwork interview agent

## Product job

Fieldwork helps a large company see where AI can improve work by interviewing a defensible sample of employees, extracting evidence from their answers, and passing that evidence into a roadmap. The interview agent is the first step in that system.

The agent asks about the work people repeat, how long it takes, which tools it touches, what makes it difficult, where it waits, how people already use AI, and which decisions must stay human. Every roadmap number comes from that record.

## Sampling policy

The workspace uses a proportional sample per team. The first prototype uses a finite-population approximation for a 95% confidence level and roughly ±10% precision:

```text
sample = population / (1 + population × margin_of_error²)
```

The result is rounded up and each team receives a minimum of three people when its population allows it. This is a discovery starting point, not a replacement for a statistician when a company needs a formally powered study. The UI shows the target, current coverage, remaining invites, employee time required, and the opportunity cost of that time using the workspace hourly-cost assumption.

## Agent graph

```mermaid
flowchart LR
  A[Context] --> B[Task inventory]
  B --> C[Task detail]
  C --> D[Friction]
  D -->|short or vague answer| D2[Concrete example probe]
  D2 --> C
  D --> E[Handoffs]
  E --> F[AI today]
  F --> G[Human boundary]
  G --> H[Employee review]
  H --> I[Structured work map]
```

The product implements this graph as a small typed state machine in `src/lib/engine/interview.ts`, with a server-side model router in `src/lib/ai/interview-agent.ts`. The state machine defines the allowed transitions and required evidence. Jev receives the current node, the employee answer, the task context, and the safe next transition, then chooses whether the agent should continue, probe, or clarify. The browser never receives the API key.

## Company research graph

Discovery is a multi-session research system rather than one giant chat. A research lead sets the sample and invite wave. Each sampled employee gets an isolated interview session with the same evidence contract, and those sessions can run in parallel. A consolidation layer groups the structured records by team and process, preserving the source quote beside every task and hour. Jev then evaluates the company-level opportunities.

```mermaid
flowchart LR
  A[Research lead\nSample + invite] --> B1[Finance interview agent]
  A --> B2[Operations interview agent]
  A --> B3[Support interview agent]
  A --> B4[More teams...]
  B1 --> C[Evidence layer\nquotes · tasks · hours · tools]
  B2 --> C
  B3 --> C
  B4 --> C
  C --> D[Company brain\npatterns across teams]
  D --> E[Jev roadmap\nsolution + readiness + ROI inputs]
```

The prototype renders this graph in Discovery so a reviewer can see the orchestration boundary. The current browser implementation uses one reusable interview agent per session; it does not create a separate codebase or prompt for every team.

## Agent capabilities

- Adaptive prompts driven by the current node and the task being discussed.
- A server-side Jev turn router that chooses among safe next moves when `JEV_API_KEY` is configured.
- Follow-up questions when a friction answer is too short to support a decision.
- Structured extraction of task names, hours, tools, pain, waits, AI use, and human boundaries.
- Employee review before submission.
- Optional Jev classification after the interview. Low-confidence classifications keep the rule-based answer and remain visible for review.

## What is live in the prototype

The browser chat in Discovery is a working agent. A person can be invited, start the agent, answer in natural language, continue an incomplete interview, edit captured tasks, and submit the reviewed record. With `JEV_API_KEY`, each answer also goes through the real server-side model router; without it, the same guarded graph runs locally and labels the session as fallback. The sample planner prepares the next wave and produces an invite brief.

Email, SMS, SSO, consent management, audio transcription, and durable multi-tenant storage are deliberately separate transport and operations layers. They should be integrated after the question flow is validated with real participants.

## Safety and review boundaries

The agent does not promise savings to the employee, decide that a person should be replaced, or execute an automation. Jev can route interview turns and prioritize opportunities, but it cannot leave the allowed graph or skip review. A company owner reviews the final roadmap, and low-confidence judgments stay on the rule-based answer.
