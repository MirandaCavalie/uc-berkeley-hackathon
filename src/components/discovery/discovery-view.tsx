"use client";

import clsx from "clsx";
import { ArrowRight, ChevronDown, ClipboardList, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { NextStep } from "@/components/app-shell";
import { Confidence } from "@/components/shared";
import { Badge, Button, Card, Empty, Input, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { judgeTasks } from "@/lib/client";
import { discoveryStats, interviewGuide, WEEKS_PER_MONTH } from "@/lib/engine/interview";
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
                toast("Interview guide copied", { description: "Use it to run a facilitated interview outside Fieldwork." });
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

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div><h2 className="font-semibold">Interview real employees</h2><p className="mt-1 text-sm text-muted">Private invitations, adaptive conversations, saved evidence, and access for research owners and team leads.</p></div>
        <NextStep href="/research" label="Open research workspace" />
      </Card>
      <InterviewSystem interviews={interviews} onOpen={setActive} />

      {stats.completed === 0 ? (
        <Empty icon={<Users className="size-5" />} title="No completed interviews yet">
          Invite the people who do the work. Each one has an 8-minute conversation with the Fieldwork interviewer, and their answers build the work map.
        </Empty>
      ) : (
        <>
          <section className="mb-10">
            <Card className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Completed interviews"
                value={stats.completed}
                sub={`${stats.invited} invited${stats.days ? ` · ${stats.days} days` : ""}`}
              />
              <Stat label="Teams" value={stats.teams} />
              <Stat label="Tasks mapped" value={stats.taskCount} />
              <Stat label="Hours/month" value={stats.hoursPerMonth.toLocaleString()} sub="in recurring tasks" />
            </Card>
          </section>

          <WorkPatterns groups={groups} />
          <AdoptionReadiness interviews={interviews} />
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

function WorkPatterns({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(groups[0]?.def.name ?? "");
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? groups : groups.slice(0, 6);
  return (
    <section className="mb-10">
      <SectionTitle title="Work patterns" meta="ranked by time spent" />
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(220px,1.5fr)_100px_110px_180px_24px] gap-4 border-b border-line bg-paper/55 px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint md:grid">
          <div>Process</div><div>People</div><div>Time/month</div><div>Signals</div><div />
        </div>
        <div className="divide-y divide-line">
          {visible.map((group) => (
            <ProcessRow key={group.def.name} group={group} open={open === group.def.name} onToggle={() => setOpen(open === group.def.name ? "" : group.def.name)} />
          ))}
        </div>
      </Card>
      {groups.length > 6 && (
        <Button className="mt-3" size="sm" variant="ghost" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Show fewer" : `Show all ${groups.length} processes`}
        </Button>
      )}
    </section>
  );
}

function ProcessRow({ group: g, open, onToggle }: { group: Group; open: boolean; onToggle: () => void }) {
  const people = [...new Set(g.tasks.map((t) => t.person))];
  const roles = [...new Set(g.tasks.map((t) => t.role))];
  return (
    <div className="overflow-hidden">
      <button type="button" onClick={onToggle} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left md:grid-cols-[minmax(220px,1.5fr)_100px_110px_180px_24px] md:gap-4">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold">{g.def.name}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">{roles.join(", ")}</div>
        </div>
        <div className="hidden text-[12.5px] text-ink-2 md:block">{people.length}</div>
        <div className="text-right text-[13px] font-semibold tabular-nums md:text-left">{Math.round(hoursOf(g))} h</div>
        <div className="hidden flex-wrap gap-1.5 md:flex">
          {g.waitMentions.length > 0 && <Badge tone="warn">{g.waitMentions.length} waiting</Badge>}
          {g.keepHuman.length > 0 && <Badge tone="human">{g.keepHuman.length} human review</Badge>}
          {g.waitMentions.length === 0 && g.keepHuman.length === 0 && <span className="text-[11.5px] text-faint">No flags</span>}
        </div>
        <ChevronDown className={clsx("hidden size-4 shrink-0 text-muted transition-transform duration-200 md:block", open && "rotate-180")} />
      </button>
      {open && (
        <div className="enter border-t border-line bg-paper/40 px-4 pt-2 pb-4">
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
    </div>
  );
}

function AdoptionReadiness({ interviews }: { interviews: Interview[] }) {
  const completed = interviews.filter((interview) => interview.status === "completed");
  const using = interviews.filter((i) => i.status === "completed" && i.aiToday && !/^\s*(no|nope|none|never|not really)\b/i.test(i.aiToday));
  const constrained = using.filter((interview) => /policy|approved|sensitive|security|not allowed|cannot|can’t|can't|restricted/i.test(interview.aiToday));
  const notUsing = completed.length - using.length;
  const signals = [
    { label: "Employee experiments", value: using.length, text: "People using AI in their own workflow" },
    { label: "Policy constraints", value: constrained.length, text: "Interviews mentioning access or data limits" },
    { label: "No current use", value: notUsing, text: "People who have not adopted an AI tool" },
  ];
  return (
    <section className="mb-10">
      <SectionTitle title="Adoption readiness" />
      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-3">
          {signals.map((signal) => (
            <div key={signal.label} className="rounded-xl bg-paper/65 p-4">
              <div className="text-[24px] font-semibold tracking-tight tabular-nums">{signal.value}</div>
              <div className="mt-1 text-[13px] font-semibold">{signal.label}</div>
              <p className="mt-1 text-[12px] leading-5 text-muted">{signal.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-line pt-4 text-[12.5px] leading-5 text-ink-2">
          {constrained.length > 0
            ? "The first rollout should use approved tools, keep company data inside policy, and make human review explicit."
            : "The first rollout should focus on the repeated tasks already visible in employee workflows and keep human review explicit."}
        </p>
      </Card>
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
