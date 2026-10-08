"use client";

import clsx from "clsx";
import { ArrowRight, FileStack, MessagesSquare, Radar, Rocket, Sparkles, SwatchBook } from "lucide-react";
import Link from "next/link";
import { SplitBar } from "@/components/radar/split-bar";
import { Badge, Card, PageHeader, ScoreRing, SectionTitle } from "@/components/ui";
import { isHex } from "@/lib/color";
import { compositeScore, creativeShare, rankOpportunities } from "@/lib/scoring";
import { useStore } from "@/lib/store";

export function Overview() {
  const workspace = useStore((s) => s.workspace);
  const evidence = useStore((s) => s.evidence);
  const brand = useStore((s) => s.brand);
  const radar = useStore((s) => s.radar);
  const review = useStore((s) => s.review);
  const launch = useStore((s) => s.launch);
  const studio = useStore((s) => s.studio);
  const events = useStore((s) => s.events);

  const ranked = radar ? rankOpportunities(radar.result.opportunities) : [];
  const pilot = radar?.result.opportunities.find((o) => o.id === radar.result.recommendedPilotId) ?? ranked[0];
  const split = radar ? creativeShare(radar.result.steps) : null;

  const approvedAssets = launch ? launch.result.assets.filter((a) => ["approved", "edited"].includes(launch.decisions[a.id] ?? "")).length : 0;
  const chosen = studio?.result.territories.find((t) => t.id === studio.chosenId);

  const workflows = [
    {
      href: "/review",
      icon: MessagesSquare,
      name: "Review Loop",
      pitch: "Fragmented feedback → one decision and a revision brief.",
      status: review
        ? review.approvedAt
          ? `Brief approved · ${review.result.comments.length} comments, ${review.result.conflicts.length} conflicts surfaced`
          : `${review.result.comments.length} comments consolidated · awaiting approval`
        : null,
      done: !!review?.approvedAt,
      recommended: pilot?.workflow === "review",
    },
    {
      href: "/launch",
      icon: Rocket,
      name: "Campaign Launch",
      pitch: "Approved brief → every channel spec, checked against the brand book.",
      status: launch ? `${approvedAssets}/${launch.result.assets.length} assets approved` : null,
      done: !!launch && approvedAssets === launch.result.assets.length,
      recommended: pilot?.workflow === "launch",
    },
    {
      href: "/studio",
      icon: Sparkles,
      name: "Creative Studio",
      pitch: "References and theme → divergent territories. The team chooses.",
      status: studio ? (chosen ? `Direction chosen: ${chosen.name}` : `${studio.result.territories.length} territories to review`) : null,
      done: !!chosen,
      recommended: pilot?.workflow === "studio",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={`${workspace.company} · Overview`}
        title={
          <>
            Let AI take the busywork. <span className="text-muted italic">Keep the creative work creative.</span>
          </>
        }
      >
        Marketing teams are adopting AI before they know which part of their workflow actually deserves it. CreativeOps Radar maps your real process from
        the evidence, shows what to automate and what to protect, and runs the first pilot with people in control.
      </PageHeader>

      {!radar ? (
        <Card className="enter mb-10 overflow-hidden">
          <div className="grid md:grid-cols-[1.2fr_1fr]">
            <div className="p-7">
              <Badge tone="accent">Start here</Badge>
              <h2 className="font-display mt-3 text-[32px] leading-tight">Run Radar on your campaign evidence.</h2>
              <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-2">
                {evidence.length} files are loaded{workspace.synthetic ? " from a clearly-labeled synthetic sample" : ""}: a brief, feedback from Slack, email and Figma, an approval timeline, a
                request queue, and channel results.
              </p>
              <Link href="/radar" className="pressable mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[14px] font-medium text-white hover:bg-[#3029c4]">
                <Radar className="size-4" /> Open Radar <ArrowRight className="size-4" />
              </Link>
            </div>
            <ol className="grid gap-px bg-line">
              {[
                ["Discover", "Reconstruct the workflow from briefs, feedback, approvals, and results."],
                ["Decide", "See what to automate, what AI should assist, and what stays creative — ranked transparently."],
                ["Pilot", "Run the top opportunity as a human-approved workflow and measure it against your baseline."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4 bg-surface p-5">
                  <span className="font-display text-[26px] leading-none text-faint">{i + 1}</span>
                  <div>
                    <div className="text-[14px] font-semibold">{t}</div>
                    <div className="text-[13px] leading-relaxed text-muted">{d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      ) : (
        <div className="mb-10 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Card className="enter p-6">
            <div className="mb-1 text-[11.5px] font-medium tracking-wide text-muted uppercase">Where the hours go</div>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-display text-[44px] leading-none">{split ? split.automatePct + split.assistPct : 0}%</span>
              <span className="text-[14px] text-ink-2">of tracked hours is work AI can take or assist</span>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {split?.humanPct}% stays with people — concept, review judgment, craft, and approval. ≈{Math.round(split?.total ?? 0)} h / month across {radar.result.steps.length} steps.
            </p>
            <div className="mt-5">{radar && <SplitBar steps={radar.result.steps} compact />}</div>
            <div className="mt-3 flex gap-4 text-[12px] text-muted">
              <Legend className="bg-automate" label={`Automate ${split?.automatePct}%`} />
              <Legend className="bg-assist" label={`AI-assisted ${split?.assistPct}%`} />
              <Legend className="bg-human" label={`Keep creative ${split?.humanPct}%`} />
            </div>
          </Card>
          {pilot && (
            <Card className="enter p-6 shadow-[0_0_0_1.5px_var(--color-accent),var(--shadow-card)]" style={{ "--i": 1 } as React.CSSProperties}>
              <div className="mb-3 flex items-center justify-between">
                <Badge tone="accent">Recommended first pilot</Badge>
                <ScoreRing value={compositeScore(pilot.scores)} />
              </div>
              <div className="text-[18px] font-semibold tracking-tight">{pilot.title}</div>
              <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-ink-2">{pilot.problem}</p>
              <div className="mt-3 text-[12.5px] text-muted">
                <span className="font-medium text-ink-2">Metric:</span> {pilot.metric}
              </div>
              <Link href="/radar" className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                See the evidence <ArrowRight className="size-3.5" />
              </Link>
            </Card>
          )}
        </div>
      )}

      <section className="mb-10">
        <SectionTitle eyebrow="Pilots" title="Workflows">
          Each one is the AI-assisted version of a step Radar flags — with a human gate before anything ships.
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {workflows.map((w, i) => {
            const Icon = w.icon;
            return (
              <Link
                key={w.href}
                href={w.href}
                style={{ "--i": i } as React.CSSProperties}
                className={clsx("enter lift pressable group flex flex-col rounded-xl bg-surface p-5 shadow-card", w.recommended && "shadow-[0_0_0_1.5px_var(--color-accent),var(--shadow-card)]")}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-sunken">
                    <Icon className="size-4.5 text-ink-2" strokeWidth={1.8} />
                  </span>
                  {w.recommended && <Badge tone="accent">Radar pick</Badge>}
                </div>
                <div className="text-[15px] font-semibold tracking-tight">{w.name}</div>
                <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{w.pitch}</p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px]">
                  <span className={clsx("flex items-center gap-1.5", w.done ? "text-good" : w.status ? "text-ink-2" : "text-faint")}>
                    <span className={clsx("size-1.5 rounded-full", w.done ? "bg-good" : w.status ? "bg-assist" : "bg-line-strong")} />
                    {w.status ?? "Not started"}
                  </span>
                  <ArrowRight className="size-3.5 text-faint transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <SectionTitle eyebrow="Foundation" title="Shared context" />
          <Link href="/brand" className="lift pressable flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card">
            <div className="flex h-9 overflow-hidden rounded-md">
              {brand.colors.slice(0, 5).map((c, i) => (
                <span key={i} className="w-3" style={{ background: isHex(c.hex) ? c.hex : "#fff" }} />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13.5px] font-medium">
                <SwatchBook className="size-3.5 text-muted" /> Brand Kit
              </div>
              <div className="truncate text-[12px] text-muted">
                {brand.colors.length} colors · {brand.bannedWords.length} banned words · {brand.claimRules.length} claim rules
              </div>
            </div>
            <ArrowRight className="size-3.5 text-faint" />
          </Link>
          <Link href="/radar" className="lift pressable flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card">
            <span className="grid size-9 place-items-center rounded-md bg-sunken">
              <FileStack className="size-4 text-ink-2" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium">Evidence</div>
              <div className="truncate text-[12px] text-muted">
                {evidence.length} files · {[...new Set(evidence.map((e) => e.source))].join(", ")}
              </div>
            </div>
            <ArrowRight className="size-3.5 text-faint" />
          </Link>
        </div>
        <div>
          <SectionTitle eyebrow="Pilot log" title="Activity" />
          <Card className="divide-y divide-line">
            {events.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-faint">Runs, approvals, and exports show up here.</div>}
            {events.slice(0, 8).map((e) => (
              <div key={e.id} className="flex gap-3 px-4 py-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{e.title}</div>
                  <div className="truncate text-[12px] text-muted">{e.detail}</div>
                </div>
                <span className="shrink-0 text-[11.5px] text-faint" suppressHydrationWarning>
                  {new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </section>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx("size-2 rounded-sm", className)} />
      {label}
    </span>
  );
}
