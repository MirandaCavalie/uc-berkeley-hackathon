"use client";

import clsx from "clsx";
import { ArrowRight, ChevronDown, ClipboardList, Sparkle, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { NextStep } from "@/components/app-shell";
import { Confidence } from "@/components/shared";
import { Badge, Button, Card, Empty, Input, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { judgeTasks } from "@/lib/client";
import { discoveryStats, effectiveProcess, interviewGuide, WEEKS_PER_MONTH } from "@/lib/engine/interview";
import { groupTasks, type Group } from "@/lib/engine/opportunities";
import { useStore } from "@/lib/store";
import type { Interview } from "@/lib/types";
import { InterviewRunner } from "./interview-runner";
import { InterviewSystem } from "./interview-system";

export function DiscoveryView() {
  const interviews = useStore((s) => s.interviews);
  const company = useStore((s) => s.workspace.company);
  const saveInterview = useStore((s) => s.saveInterview);
  const [active, setActive] = useState<string | null>(null);
  const stats = useMemo(() => discoveryStats(interviews), [interviews]);
  const groups = useMemo(
    () => groupTasks(interviews).sort((a, b) => b.tasks.reduce((n, t) => n + t.hoursPerWeek, 0) - a.tasks.reduce((n, t) => n + t.hoursPerWeek, 0)),
    [interviews],
  );
  useJevBackfill(interviews, saveInterview);

  const running = interviews.find((i) => i.id === active);
  if (running) return <InterviewRunner key={running.id} interview={running} onClose={() => setActive(null)} />;

  return (
    <div>
      <PageHeader
        title="Discovery"
        actions={
          <>
            <Button
              icon={<ClipboardList className="size-4" />}
              onClick={() => {
                navigator.clipboard?.writeText(interviewGuide(company));
                toast("Interview guide copied", { description: "Use it to run an interview live, then type the answers in." });
              }}
            >
              Copy interview guide
            </Button>
            {stats.completed > 0 && (
              <NextStep
                href="/opportunities"
                label={
                  <>
                    Decide where AI fits <ArrowRight className="size-3.5" />
                  </>
                }
              />
            )}
          </>
        }
      />

      <InterviewSystem interviews={interviews} />

      {stats.completed === 0 ? (
        <Empty icon={<Users className="size-5" />} title="No completed interviews yet">
          Invite the people who do the work. Each one has an 8-minute conversation with the Fieldwork interviewer, and their answers build the work map.
        </Empty>
      ) : (
        <>
          <section className="mb-10">
            <Card className="grid gap-6 p-6 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Interviews" value={`${stats.completed}/${stats.invited}`} sub={`${stats.completionRate}%${stats.days ? ` in ${stats.days} days` : ""}`} />
              <Stat label="Teams" value={stats.teams} />
              <Stat label="Tasks mapped" value={stats.taskCount} />
              <Stat label="Hours/month" value={stats.hoursPerMonth.toLocaleString()} sub="in recurring tasks" />
              <Stat label="Already use AI" value={`${stats.usingAi}/${stats.completed}`} tone="accent" sub="mostly on their own" />
              <Stat label="Rating" value={stats.avgSatisfaction ?? "—"} sub="of the interview, out of 5" />
            </Card>
          </section>

          <section className="mb-10">
            <SectionTitle title="Work map" meta="hours per month, by team and process" />
            <WorkMap interviews={interviews} groups={groups} />
          </section>

          <section className="mb-10">
            <SectionTitle title="What people told us" meta={`${groups.length} processes`} />
            <div className="space-y-2">
              {groups.map((g, i) => (
                <ProcessRow key={g.def.name} group={g} defaultOpen={i === 0} />
              ))}
            </div>
          </section>

          <AiToday interviews={interviews} />
        </>
      )}

      <section>
        <People interviews={interviews} onOpen={setActive} />
      </section>
    </div>
  );
}

function useJevBackfill(interviews: Interview[], save: (iv: Interview) => void) {
  const asked = useRef(false);
  useEffect(() => {
    const pending = interviews.filter((iv) => iv.status === "completed" && iv.tasks.some((t) => t.judgment === undefined));
    if (asked.current || !pending.length) return;
    asked.current = true;
    judgeTasks(pending).then((judged) => judged?.forEach(save));
  }, [interviews, save]);
}

const hoursOf = (g: Group) => g.tasks.reduce((n, t) => n + t.hoursPerWeek, 0) * WEEKS_PER_MONTH;

function WorkMap({ interviews, groups }: { interviews: Interview[]; groups: Group[] }) {
  const done = interviews.filter((i) => i.status === "completed");
  const teams = [...new Set(done.map((i) => i.team))];
  const cell = new Map<string, { hours: number; people: Set<string> }>();
  for (const iv of done) {
    for (const t of iv.tasks) {
      const key = `${iv.team}|${effectiveProcess(t)}`;
      const c = cell.get(key) ?? { hours: 0, people: new Set<string>() };
      c.hours += t.hoursPerWeek * WEEKS_PER_MONTH;
      c.people.add(iv.name);
      cell.set(key, c);
    }
  }
  const max = Math.max(1, ...[...cell.values()].map((c) => c.hours));
  return (
    <Card className="overflow-x-auto p-4 scrollbar-thin">
      <table className="w-full border-separate border-spacing-1 text-[11.5px]">
        <thead>
          <tr>
            <th className="w-28" />
            {groups.map((g) => (
              <th key={g.def.name} className="h-28 min-w-12 align-bottom font-normal text-muted">
                <div className="mx-auto w-4 [writing-mode:vertical-rl] rotate-180 text-left whitespace-nowrap">{g.def.name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team}>
              <th className="pr-2 text-left text-[12px] font-medium whitespace-nowrap text-ink-2">{team}</th>
              {groups.map((g) => {
                const c = cell.get(`${team}|${g.def.name}`);
                const strength = c ? 0.15 + 0.85 * (c.hours / max) : 0;
                return (
                  <td
                    key={g.def.name}
                    title={c ? `${team} · ${g.def.name}: ${Math.round(c.hours)} h/mo (${[...c.people].join(", ")})` : undefined}
                    className="h-9 rounded-md text-center tabular-nums"
                    style={{
                      background: c ? `color-mix(in oklab, var(--color-accent) ${Math.round(strength * 100)}%, white)` : "var(--color-sunken)",
                      color: strength > 0.55 ? "white" : "var(--color-ink-2)",
                      opacity: c ? 1 : 0.5,
                    }}
                  >
                    {c ? Math.round(c.hours) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th className="pt-1 pr-2 text-left text-[11.5px] font-normal text-muted">Total</th>
            {groups.map((g) => (
              <td key={g.def.name} className="pt-1 text-center font-medium text-ink tabular-nums">
                {Math.round(hoursOf(g))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

function ProcessRow({ group: g, defaultOpen }: { group: Group; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const people = [...new Set(g.tasks.map((t) => t.person))];
  const roles = [...new Set(g.tasks.map((t) => t.role))];
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold tracking-tight">{g.def.name}</span>
            {g.waitMentions.length > 0 && (
              <Badge tone="warn">
                {g.waitMentions.length} {g.waitMentions.length === 1 ? "person waits" : "people wait"} on this
              </Badge>
            )}
            {g.keepHuman.length > 0 && <Badge tone="human">{g.keepHuman.length} want it human</Badge>}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-muted">
            {people.length} {people.length === 1 ? "person" : "people"} · {roles.join(", ")}
          </div>
        </div>
        <div className="text-right text-[14px] font-semibold tabular-nums">{Math.round(hoursOf(g))} h/mo</div>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="enter border-t border-line px-4 pt-2 pb-4">
          <div className="divide-y divide-line">
            {g.tasks.map((t) => (
              <div key={t.id} className="grid gap-x-4 gap-y-1 py-2 md:grid-cols-[160px_1fr_70px_auto]">
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium">{t.person}</div>
                  <div className="truncate text-[11px] text-faint">{t.role}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] text-ink-2">{t.name}</div>
                  {t.pain && <div className="mt-0.5 text-[12px] text-muted">“{t.pain}”</div>}
                </div>
                <div className="text-[12.5px] text-muted tabular-nums md:text-right">{t.hoursPerWeek} h/wk</div>
                <div className="flex items-start md:justify-end">{t.judgment && <Confidence judgment={t.judgment} />}</div>
              </div>
            ))}
          </div>
          {g.keepHuman.map((k) => (
            <div key={k.person} className="mt-2 rounded-lg bg-human-soft/60 px-3 py-2 text-[12.5px] text-ink-2">
              <span className="font-medium text-human">{k.person}:</span> “{k.text}”
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AiToday({ interviews }: { interviews: Interview[] }) {
  const using = interviews.filter((i) => i.status === "completed" && i.aiToday && !/^\s*(no|nope|none|never|not really)\b/i.test(i.aiToday));
  if (!using.length) return null;
  return (
    <section className="mb-10">
      <SectionTitle title="AI already in use" meta={`${using.length} people, mostly without a company tool`} />
      <div className="grid gap-2 md:grid-cols-2">
        {using.map((iv) => (
          <figure key={iv.id} className="flex gap-2.5 rounded-xl bg-surface p-3 shadow-card">
            <Sparkle className="mt-0.5 size-3.5 shrink-0 text-signal" />
            <div>
              <blockquote className="text-[13px] leading-relaxed text-ink-2">“{iv.aiToday}”</blockquote>
              <figcaption className="mt-0.5 text-[11.5px] text-muted">
                {iv.name}, {iv.role}
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

const statusTone = { invited: "neutral", "in-progress": "warn", completed: "good" } as const;
const statusLabel = { invited: "Invited", "in-progress": "In progress", completed: "Completed" } as const;

function People({ interviews, onOpen }: { interviews: Interview[]; onOpen: (id: string) => void }) {
  const invite = useStore((s) => s.inviteInterview);
  const remove = useStore((s) => s.removeInterview);
  const [form, setForm] = useState({ name: "", role: "", team: "" });
  const [adding, setAdding] = useState(false);

  function add() {
    if (!form.name.trim() || !form.role.trim()) return;
    invite({ name: form.name.trim(), role: form.role.trim(), team: form.team.trim() || "General" });
    toast.success(`${form.name.trim()} invited`);
    setForm({ name: "", role: "", team: "" });
  }

  return (
    <>
      <SectionTitle
        title="People"
        meta={interviews.length}
        action={
          <Button size="sm" onClick={() => setAdding((a) => !a)} icon={<UserPlus className="size-3.5" />}>
            Invite
          </Button>
        }
      />
      {adding && (
        <Card className="enter mb-2 flex flex-wrap items-center gap-2 p-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="max-w-[200px]" aria-label="Name" />
          <Input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="max-w-[200px]" aria-label="Role" />
          <Input
            placeholder="Team"
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="max-w-[160px]"
            aria-label="Team"
          />
          <Button variant="primary" onClick={add} disabled={!form.name.trim() || !form.role.trim()}>
            Add
          </Button>
        </Card>
      )}
      <Card className="divide-y divide-line">
        {interviews.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-faint">Nobody invited yet</div>}
        {interviews.map((iv) => {
          const hours = iv.tasks.reduce((n, t) => n + t.hoursPerWeek, 0);
          return (
            <div key={iv.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 md:grid-cols-[1.2fr_1fr_110px_60px_auto]">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium">{iv.name}</div>
                <div className="truncate text-[12px] text-muted">
                  {iv.role} · {iv.team}
                </div>
              </div>
              <div className="hidden text-[12.5px] text-muted md:block">
                {iv.status === "completed" ? `${iv.tasks.length} tasks · ${Math.round(hours * 10) / 10} h/wk` : iv.status === "in-progress" ? "Partly answered" : "Not started"}
              </div>
              <div className="hidden md:block">
                <Badge tone={statusTone[iv.status]}>{statusLabel[iv.status]}</Badge>
              </div>
              <div className="hidden text-[12px] text-faint md:block">{iv.satisfaction ? `${iv.satisfaction}/5` : ""}</div>
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant={iv.status === "completed" ? "ghost" : "primary"} onClick={() => onOpen(iv.id)}>
                  {iv.status === "completed" ? "View record" : iv.status === "in-progress" ? "Continue agent" : "Start agent"}
                </Button>
                <button
                  type="button"
                  onClick={() => remove(iv.id)}
                  aria-label={`Remove ${iv.name}`}
                  className="pressable grid size-7 place-items-center rounded-md text-faint hover:bg-sunken hover:text-bad"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}
