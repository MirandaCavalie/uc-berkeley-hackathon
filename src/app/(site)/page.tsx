import { ArrowRight, Check, MessagesSquare, Quote, Scale, Map as MapIcon } from "lucide-react";
import Image from "next/image";
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
  { day: "Monday", title: "Invite the wave", body: "One focused invite per team." },
  { day: "Tuesday–Wednesday", title: "Listen to the work", body: "Short conversations, in their own words." },
  { day: "Thursday", title: "Make the calls", body: "Evidence becomes a ranked set of choices." },
  { day: "Friday", title: "Review the roadmap", body: "Owners, next steps, and human boundaries." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" aria-label="Fieldwork home">
            <Wordmark size={28} />
          </Link>
          <nav className="flex items-center gap-1 text-[13.5px]">
            <a href="#how" className="hidden rounded-lg px-3 py-1.5 text-ink-2 hover:bg-sunken sm:block">
              Product
            </a>
            <a href="#types" className="hidden rounded-lg px-3 py-1.5 text-ink-2 hover:bg-sunken sm:block">
              Decisions
            </a>
            <Link
              href="/discovery"
              className="pressable ml-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 font-medium text-white hover:bg-ink-2"
            >
              Open demo
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-14 pb-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[12.5px] text-muted shadow-card">
            <span className="size-1.5 rounded-full bg-signal" />
            AI work discovery for large teams
          </div>
          <h1 className="font-display max-w-xl text-[46px] leading-[1.02] text-ink sm:text-[64px]">{BRAND.tagline}</h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">{BRAND.pitch}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/discovery"
              className="pressable inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[14.5px] font-medium text-white shadow-[0_1px_2px_rgb(109_69_217/0.35)] hover:bg-accent-2"
            >
              Open the workspace <ArrowRight className="size-4" />
            </Link>
            <a
              href="/demo/fieldwork-demo.mp4"
              target="_blank"
              rel="noreferrer"
              className="pressable inline-flex h-11 items-center rounded-lg bg-surface px-5 text-[14.5px] font-medium shadow-card hover:bg-[#fbfaf7]"
            >
              Watch the demo
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
            {["Team quotas", "Source quotes", "Human review"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-accent" /> {t}
              </span>
            ))}
          </div>
        </div>
        <InterviewMock />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="overflow-hidden rounded-2xl bg-surface shadow-raised ring-1 ring-line">
          <div className="flex items-center gap-3 border-b border-line bg-paper/70 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
            </div>
            <div className="mx-auto rounded-md bg-surface px-3 py-0.5 text-[11.5px] text-muted shadow-card">app.fieldwork.ai/northwind/roadmap</div>
            <div className="w-10" />
          </div>
          <Image src="/product/fieldwork-roadmap.png" alt="Northwind Freight's AI roadmap in Fieldwork" width={2880} height={1630}
            sizes="(min-width: 1152px) 1104px, 100vw" className="h-auto w-full" priority />
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
          {[
            { k: "The mandate", v: "Build an AI plan people can actually use." },
            { k: "The signal", v: "The people doing the work know where the hours go." },
            { k: "The output", v: "A ranked roadmap with evidence behind every decision." },
          ].map((x) => (
            <div key={x.k}>
              <div className="text-[12.5px] font-medium tracking-wide text-signal uppercase">{x.k}</div>
              <p className="mt-2 text-[17px] leading-relaxed text-ink">{x.v}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-16 mx-auto max-w-6xl px-6 py-20">
        <div className="eyebrow">From signal to decision</div>
        <h2 className="mt-3 font-display text-[32px] leading-tight">One clear path to an AI roadmap</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: MessagesSquare,
              step: "1",
              title: "Discovery",
              body: "Sample each team, then run focused conversations about tasks, time, tools, friction, and human judgment.",
            },
            {
              icon: Scale,
              step: "2",
              title: "Decision",
              body: "Group the evidence by team and process. Keep the quote beside the finding and send weak evidence back for review.",
            },
            {
              icon: MapIcon,
              step: "3",
              title: "Roadmap",
              body: "Prioritize the work with value, readiness, risk, owners, and a metric. Keep judgment with the people who own it.",
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

      <section id="types" className="scroll-mt-16 bg-ink text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-[32px] leading-tight">Not everything should be an agent</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65">
            The right answer is sometimes automation, sometimes an agent, and sometimes a human checkpoint.
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
        <div className="eyebrow">The engagement</div>
        <h2 className="mt-3 font-display text-[32px] leading-tight">A week of useful evidence</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">A proportional sample keeps discovery focused. Every conversation makes the next decision clearer.</p>
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
            { t: "Ask the people doing the work", b: "See the tasks the org chart misses." },
            { t: "Keep evidence close", b: "Trace every finding back to a source answer." },
            { t: "Leave judgment human", b: "Make room for context, risk, and ownership." },
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
            <div className="font-display text-[28px] leading-tight">See the work behind the roadmap</div>
            <p className="mt-2 max-w-lg text-[14.5px] text-white/75">Explore the Fieldwork workspace from interview to decision.</p>
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
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Wordmark size={24} />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">{BRAND.tagline}</p>
          </div>
          {[
            {
              title: "Product",
              links: [
                ["Discovery", "/discovery"],
                ["Opportunities", "/opportunities"],
                ["Roadmap", "/roadmap"],
              ],
            },
            {
              title: "Learn",
              links: [
                ["How it works", "#how"],
                ["What we recommend", "#types"],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-[12px] font-medium text-faint">{col.title}</div>
              <ul className="mt-3 space-y-2 text-[13.5px]">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-ink-2 hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 border-t border-line px-6 py-5 text-[12px] text-faint">
          <span>© 2026 Fieldwork</span>
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
