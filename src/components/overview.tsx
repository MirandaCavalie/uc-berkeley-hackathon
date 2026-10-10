"use client";

import clsx from "clsx";
import { ArrowRight, Check, FileStack, GitMerge, Radar, Rocket, Route, Sparkles, SwatchBook, Users } from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader, SectionTitle } from "@/components/ui";
import { formatDuration } from "@/lib/baseline";
import { isHex } from "@/lib/color";
import { hoursRecovered, loopBaseline } from "@/lib/engine/loop";
import { useStore } from "@/lib/store";

export function Overview() {
  const workspace = useStore((s) => s.workspace);
  const evidence = useStore((s) => s.evidence);
  const interviews = useStore((s) => s.interviews);
  const brand = useStore((s) => s.brand);
  const review = useStore((s) => s.review);
  const events = useStore((s) => s.events);

  const b = loopBaseline(evidence, interviews);
  const recovered = hoursRecovered(b);
  const completed = interviews.filter((i) => i.status === "completed").length;
  const quote = b.quotes[0];
  const elapsed = review?.approvedAt ? Date.parse(review.approvedAt) - Date.parse(review.createdAt) : null;

  const steps = [
    {
      href: "/interviews",
      icon: Users,
      name: "Interview the team",
      status: interviews.length ? `${completed}/${interviews.length} interviewed` : null,
      done: interviews.length > 0 && completed === interviews.length,
    },
    {
      href: "/review",
      icon: GitMerge,
      name: "Consolidate each round",
      status: review ? (review.approvedAt ? "Brief approved" : `${review.result.comments.length} comments consolidated`) : null,
      done: !!review?.approvedAt,
    },
    {
      href: "/review",
      icon: Check,
      name: "Measure against your baseline",
      status: elapsed != null ? `${formatDuration(elapsed)} vs ${b.consolidationDays ?? "?"} days` : b.consolidationDays != null ? `Baseline ${b.consolidationDays} days` : null,
      done: elapsed != null,
    },
  ];

  const labs = [
    { href: "/radar", icon: Radar, name: "Radar", pitch: "Map every step of the workflow" },
    { href: "/learn", icon: Route, name: "Learning", pitch: "Rebuild the path from artifacts" },
    { href: "/launch", icon: Rocket, name: "Campaign Launch", pitch: "Brief to channel assets" },
    { href: "/studio", icon: Sparkles, name: "Creative Studio", pitch: "References to directions" },
  ];

  return (
    <div>
      <PageHeader title={workspace.company} />

      <div className="mb-10 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="enter p-6">
          <div className="mb-4 text-[12px] font-medium tracking-wide text-muted uppercase">The feedback loop today</div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-[44px] leading-none tabular-nums">{b.loopDays ?? "—"}</span>
            <span className="text-[15px] text-ink-2">days from first review to final revision</span>
          </div>
          <div className="mt-2 text-[13px] text-muted tabular-nums">
            {[b.rounds && `${b.rounds} rounds`, b.handReconciled && `${b.handReconciled} comments reconciled by hand`, b.consolidationDays && `${b.consolidationDays} days consolidating`]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {quote && (
            <figure className="mt-5 rounded-lg bg-sunken/60 px-4 py-3">
              <blockquote className="text-[14px] leading-relaxed text-ink">“{quote.text}”</blockquote>
              <figcaption className="mt-1 text-[12px] text-muted">
                {quote.person}, {quote.role}
              </figcaption>
            </figure>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/review" className="pressable inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[14px] font-medium text-white hover:bg-[#3029c4]">
              <GitMerge className="size-4" /> Consolidate this round
            </Link>
            <Link href="/interviews" className="pressable inline-flex h-10 items-center rounded-lg bg-surface px-4 text-[14px] font-medium shadow-card hover:bg-[#fbfaf7]">
              See the interviews
            </Link>
          </div>
        </Card>

        <Card className="enter p-6 shadow-[0_0_0_1.5px_var(--color-accent),var(--shadow-card)]" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[12px] font-medium tracking-wide text-muted uppercase">With Review Loop</span>
            {workspace.synthetic && <Badge tone="warn">Synthetic</Badge>}
          </div>
          <div className="space-y-4">
            <Value value={recovered != null ? `~${recovered} h/mo` : "—"} label="back to the design team" />
            <Value value={elapsed != null ? formatDuration(elapsed) : "Minutes"} label={`to consolidate a round, vs ${b.consolidationDays ?? "?"} days`} />
            <Value value={b.conflictRounds ? `${b.conflictRounds} fewer round` : "Fewer rounds"} label="when conflicts are decided before revision" />
          </div>
          <div className="mt-5 rounded-lg bg-human-soft/60 px-3 py-2 text-[12.5px] text-ink-2">
            <span className="font-medium text-human">Designers keep the design.</span> AI organizes feedback and never edits the asset.
          </div>
        </Card>
      </div>

      <section className="mb-10">
        <SectionTitle title="Pilot" />
        <ol className="grid gap-3 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.name} style={{ "--i": i } as React.CSSProperties} className="enter">
                <Link href={s.href} className="lift pressable group flex h-full flex-col rounded-xl bg-surface p-5 shadow-card">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-lg bg-sunken">
                      <Icon className="size-4.5 text-ink-2" strokeWidth={1.8} />
                    </span>
                    <span className="text-[12px] text-faint tabular-nums">{i + 1}</span>
                  </div>
                  <div className="flex-1 text-[15px] font-semibold tracking-tight">{s.name}</div>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px]">
                    <span className={clsx("flex items-center gap-1.5", s.done ? "text-good" : s.status ? "text-ink-2" : "text-faint")}>
                      <span className={clsx("size-1.5 rounded-full", s.done ? "bg-good" : s.status ? "bg-assist" : "bg-line-strong")} />
                      {s.status ?? "Not started"}
                    </span>
                    <ArrowRight className="size-3.5 text-faint transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mb-10 grid gap-4 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <SectionTitle title="Context" />
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
                {brand.guidelines.length} guidelines · {brand.bannedWords.length} banned words · {brand.claimRules.length} claim rules
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
          <SectionTitle title="Activity" />
          <Card className="divide-y divide-line">
            {events.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-faint">No activity yet</div>}
            {events.slice(0, 6).map((e) => (
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

      <section>
        <SectionTitle title="Labs" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {labs.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className="pressable flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-sunken">
                <Icon className="size-4 shrink-0 text-muted" strokeWidth={1.8} />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{l.name}</div>
                  <div className="truncate text-[12px] text-muted">{l.pitch}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Value({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[26px] font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-[13px] text-muted">{label}</div>
    </div>
  );
}
