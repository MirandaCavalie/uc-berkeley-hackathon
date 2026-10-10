import { ArrowRight, Check, MessagesSquare, Quote, Scale, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { BRAND, Logo, Wordmark } from "@/components/brand";
import { solutionMeta } from "@/lib/engine/processes";
import type { Solution } from "@/lib/types";

const solutionStyle: Record<Solution, string> = {
  automation: "bg-automation-soft text-automation",
  skill: "bg-skill-soft text-skill",
  agent: "bg-agent-soft text-agent",
  human: "bg-human-soft text-human",
};

const examples: Record<Solution, string> = {
  automation: "The weekly KPI report builds itself from NetSuite and the TMS.",
  skill: "Support drafts “where is my shipment” replies in one click.",
  agent: "Dispatch requests get matched to driver capacity and confirmed.",
  human: "Carrier negotiations stay with the people who own the relationship.",
};

const week = [
  { day: "Monday", title: "Invite everyone", body: "One link per employee. No workshops, no calendars." },
  { day: "Tuesday–Wednesday", title: "Everyone talks to the interviewer", body: "Eight minutes each, in their own words, at the same time." },
  { day: "Thursday", title: "Jev decides", body: "Each process gets a type of AI, readiness scores, and a priority." },
  { day: "Friday", title: "Roadmap review", body: "Quick wins this month, what to build next, and what stays human." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Wordmark size={30} />
        <nav className="flex items-center gap-1 text-[13.5px]">
          <a href="#how" className="hidden rounded-lg px-3 py-1.5 text-ink-2 hover:bg-sunken sm:block">
            How it works
          </a>
          <a href="#types" className="hidden rounded-lg px-3 py-1.5 text-ink-2 hover:bg-sunken sm:block">
            What we recommend
          </a>
          <Link href="/discovery" className="pressable ml-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 font-medium text-white hover:bg-ink-2">
            Open demo
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-14 pb-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[12.5px] text-muted shadow-card">
            <span className="size-1.5 rounded-full bg-signal" />
            AI discovery for companies that don&apos;t know where to start
          </div>
          <h1 className="font-display text-[44px] leading-[1.05] text-ink sm:text-[58px]">{BRAND.tagline}</h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">{BRAND.pitch}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/discovery"
              className="pressable inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[14.5px] font-medium text-white shadow-[0_1px_2px_rgb(30_90_64/0.35)] hover:bg-accent-2"
            >
              See it with a real company <ArrowRight className="size-4" />
            </Link>
            <Link href="/roadmap" className="pressable inline-flex h-11 items-center rounded-lg bg-surface px-5 text-[14.5px] font-medium shadow-card hover:bg-[#fbfaf7]">
              View a sample roadmap
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
            {["Every employee, not a sample", "Roadmap in one week", "Every number traces to a quote"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-accent" /> {t}
              </span>
            ))}
          </div>
        </div>
        <InterviewMock />
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
          {[
            { k: "The mandate", v: "Every board wants an AI plan. Most companies start by buying tools and hoping someone uses them." },
            { k: "The guess", v: "Consultants interview twenty people over three months and deliver a deck that is outdated on arrival." },
            { k: "The answer", v: "The people doing the work already know where the hours go. Nobody asks all of them." },
          ].map((x) => (
            <div key={x.k}>
              <div className="text-[12.5px] font-medium tracking-wide text-signal uppercase">{x.k}</div>
              <p className="mt-2 text-[17px] leading-relaxed text-ink">{x.v}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-[32px] leading-tight">Two workflows, one roadmap</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: MessagesSquare,
              step: "1",
              title: "Discovery",
              body: "An AI interviewer talks to every employee at once. It asks what they repeat each week, how long it takes, what slows it down, and where it digs deeper. Answers become a work map of hours by team and process.",
            },
            {
              icon: Scale,
              step: "2",
              title: "Decision",
              body: "Jev, a decision model, reads each process and decides what fits: an automation, an AI skill, an agent, or nothing at all. It scores readiness and risk, and shows its confidence. Low-confidence calls go to a person.",
            },
            {
              icon: MapIcon,
              step: "3",
              title: "Roadmap",
              body: "Ranked initiatives in three phases, each with a blueprint, a human checkpoint, and the metric to measure it. Ninety days later, the same people answer again, and the roadmap updates.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl bg-surface p-6 shadow-card">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-accent text-[13px] font-semibold text-white">{c.step}</span>
                <c.icon className="size-4 text-muted" />
              </div>
              <div className="mt-4 text-[17px] font-semibold tracking-tight">{c.title}</div>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="types" className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-[32px] leading-tight">Not everything should be an agent</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65">
            The most common AI mistake is the wrong tool for the work. Fieldwork recommends one of four, for every process it finds.
          </p>
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(solutionMeta) as Solution[]).map((s) => (
              <div key={s} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${solutionStyle[s]}`}>{solutionMeta[s].label}</span>
                <p className="mt-3 text-[13.5px] leading-relaxed text-white/80">{solutionMeta[s].definition}</p>
                <p className="mt-3 border-t border-white/10 pt-3 text-[12.5px] leading-relaxed text-white/55">{examples[s]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-[32px] leading-tight">One week from kickoff to roadmap</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">A traditional discovery project samples a few people over months. Fieldwork asks everyone in a week.</p>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {week.map((w, i) => (
            <li key={w.day} className="relative rounded-2xl bg-surface p-5 shadow-card">
              <div className="text-[12px] font-medium text-signal">{w.day}</div>
              <div className="mt-1 text-[15px] font-semibold tracking-tight">{w.title}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{w.body}</p>
              <span className="absolute top-5 right-5 text-[12px] text-faint tabular-nums">0{i + 1}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { t: "Ask the people who do the work", b: "Leaders see the org chart. Employees see where the hours go." },
            { t: "Every number traces to a quote", b: "Each hour on the roadmap links back to the person who reported it." },
            { t: "Human by default where judgment matters", b: "If people say it should stay human, Jev hears it, and so does the roadmap." },
          ].map((p) => (
            <div key={p.t} className="rounded-2xl border border-line-strong p-5">
              <Quote className="size-4 text-signal" />
              <div className="mt-3 text-[15px] font-semibold tracking-tight">{p.t}</div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-accent p-10 text-white md:flex-row md:items-center">
          <div>
            <div className="font-display text-[28px] leading-tight">See Northwind Freight&apos;s roadmap</div>
            <p className="mt-2 max-w-lg text-[14.5px] text-white/75">10 employees, 6 teams, 37 recurring tasks. From interviews to a ranked AI roadmap in one sitting.</p>
          </div>
          <Link
            href="/discovery"
            className="pressable inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-white px-5 text-[14.5px] font-medium text-accent hover:bg-white/90"
          >
            Open the demo <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[12.5px] text-muted">
          <Wordmark size={20} />
          <span>Built at the UC Berkeley AI Hackathon · Decisions by Jev</span>
        </div>
      </footer>
    </div>
  );
}

function InterviewMock() {
  const lines: { from: "ai" | "person"; text: string }[] = [
    { from: "ai", text: "What makes “Matching invoices to purchase orders” slow or frustrating?" },
    { from: "person", text: "Quantities never match." },
    { from: "ai", text: "Can you walk me through the last time that happened?" },
    { from: "person", text: "A carrier billed 14 pallets, the PO said 12, and I spent an hour emailing the warehouse." },
  ];
  return (
    <div className="relative">
      <div className="rounded-2xl bg-surface p-5 shadow-raised">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[13.5px] font-semibold">Dana Okafor</div>
            <div className="text-[12px] text-muted">AP Specialist · Finance</div>
          </div>
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11.5px] font-medium text-accent">Interview 7 of 12</span>
        </div>
        <div className="space-y-2.5">
          {lines.map((l, i) =>
            l.from === "ai" ? (
              <div key={i} className="flex items-start gap-2">
                <Logo size={24} />
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-paper px-3 py-2 text-[13px] leading-relaxed">{l.text}</div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3 py-2 text-[13px] leading-relaxed text-white">{l.text}</div>
              </div>
            ),
          )}
        </div>
      </div>
      <div className="relative -mt-4 ml-6 w-64 rounded-xl bg-surface p-3.5 shadow-raised sm:-ml-8">
        <div className="text-[11.5px] text-muted">Invoice & expense processing</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-md bg-agent-soft px-1.5 py-0.5 text-[11.5px] font-medium text-agent">AI agent</span>
          <span className="inline-flex items-center gap-1 rounded bg-sunken px-1 py-px text-[10.5px] font-medium text-muted">
            <Scale className="size-3" />
            97%
          </span>
        </div>
        <div className="mt-2 text-[12px] leading-relaxed text-ink-2">Stops and asks AP when amounts don&apos;t match the order.</div>
      </div>
    </div>
  );
}
