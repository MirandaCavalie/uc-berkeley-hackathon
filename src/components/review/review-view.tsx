"use client";

import clsx from "clsx";
import { Check, ClipboardCopy, Copy, GitMerge, Pencil, Scale, Timer, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EngineStamp, HumanGate, useTask } from "@/components/shared";
import { Badge, Button, Card, Field, Input, PageHeader, SectionTitle, Skeleton, Stat, Textarea } from "@/components/ui";
import { formatDuration, stageBaseline } from "@/lib/baseline";
import type { ReviewComment, ReviewResult } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import type { BrandKit, ReviewState } from "@/lib/types";

const priorityTone = { must: "bad", should: "warn", could: "neutral" } as const;

const directionPhrase: Record<string, string> = {
  bigger: "make it bigger",
  smaller: "make it smaller",
  keep: "keep as is",
  louder: "go bolder",
  calmer: "keep it calm",
  warmer: "warm it up",
  cooler: "keep it cool",
  remove: "remove it",
  replace: "replace it",
  add: "add it",
};

export function ReviewView() {
  const brand = useStore((s) => s.brand);
  const draft = useStore((s) => s.drafts.review);
  const setDraft = useStore((s) => s.setDraft);
  const review = useStore((s) => s.review);
  const setReview = useStore((s) => s.setReview);
  const log = useStore((s) => s.log);
  const { run, loading } = useTask("review");
  const [editing, setEditing] = useState(false);

  async function consolidate() {
    const res = await run({ input: draft, brand });
    if (!res) return;
    setReview({ ...res, input: draft, decisions: {}, conflictResolutions: {}, approvedAt: null });
    setEditing(false);
    log({
      workflow: "review",
      title: "Feedback consolidated",
      detail: `${res.result.comments.length} comments → ${res.result.clusters.length} themes, ${res.result.conflicts.length} conflicts`,
    });
  }

  const showInput = !review || editing;

  return (
    <div>
      <PageHeader
        title="Review Loop"
        actions={
          review && !editing ? (
            <Button variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>
              Edit feedback
            </Button>
          ) : null
        }
      />

      {showInput && (
        <Card className="enter mb-10 p-5">
          <div className="grid gap-4">
            <Field label="Asset under review">
              <Input value={draft.assetName} onChange={(e) => setDraft("review", { assetName: e.target.value })} placeholder="Spring hero v2" />
            </Field>
            <Field label="Feedback" hint="Slack, email, Figma">
              <Textarea
                value={draft.feedback}
                onChange={(e) => setDraft("review", { feedback: e.target.value })}
                className="max-h-[420px] min-h-56 font-mono text-[12.5px]"
              />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-muted">{draft.feedback.split(/\n/).filter((l) => l.trim()).length} lines</span>
              <div className="flex gap-2">
                {editing && (
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
                <Button variant="accent" loading={loading} disabled={draft.feedback.trim().length < 10} onClick={consolidate} icon={<GitMerge className="size-4" />}>
                  Consolidate feedback
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-36" />
          <Skeleton className="h-64" />
        </div>
      )}

      {!loading && review && <ReviewResults review={review} brand={brand} />}
    </div>
  );
}

function ReviewResults({ review, brand }: { review: ReviewState; brand: BrandKit }) {
  const decideReview = useStore((s) => s.decideReview);
  const resolveConflict = useStore((s) => s.resolveConflict);
  const approveReview = useStore((s) => s.approveReview);
  const evidence = useStore((s) => s.evidence);
  const log = useStore((s) => s.log);
  const r = review.result;

  const byId = useMemo(() => new Map(r.comments.map((c) => [c.id, c])), [r.comments]);
  const dupIds = new Set(r.duplicates.flatMap((d) => d.commentIds.slice(1)));
  const reviewers = new Set(r.comments.map((c) => c.author)).size;
  const channels = new Set(r.comments.map((c) => c.source)).size;
  const baseline = stageBaseline(evidence, /consolidat/i);

  const decided = r.clusters.filter((c) => review.decisions[c.id] && review.decisions[c.id] !== "pending").length;
  const resolved = r.conflicts.filter((c) => review.conflictResolutions[c.id]).length;
  const markdown = buildBrief(review);

  function approve() {
    approveReview();
    navigator.clipboard?.writeText(markdown).catch(() => {});
    const elapsed = Date.now() - Date.parse(review.createdAt);
    log({
      workflow: "review",
      title: "Revision brief approved",
      detail: `${r.comments.length} comments → ${r.clusters.filter((c) => review.decisions[c.id] === "approved").length} approved changes · ${resolved}/${r.conflicts.length} conflicts decided · ${formatDuration(elapsed)} to brief`,
    });
    toast.success("Revision brief approved", { description: "Copied as Markdown" });
  }

  return (
    <div className="space-y-10">
      <Card className="enter p-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
          <Stat label="Comments" value={r.comments.length} />
          <Stat label="Reviewers" value={reviewers} />
          <Stat label="Channels" value={channels} />
          <Stat label="Conflicts" value={r.conflicts.length} tone={r.conflicts.length ? "human" : undefined} />
          <Stat label="Duplicates" value={r.duplicates.length} sub="counted once" />
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <EngineStamp engine={review.engine} createdAt={review.createdAt} warning={review.warning} />
        </div>
      </Card>

      <section className="enter" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white md:p-8">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-medium tracking-wide text-white/60 uppercase">
            <Scale className="size-3.5" /> Blocking decision
          </div>
          <div className="font-display max-w-3xl text-[26px] leading-[1.2]">{r.blockingDecision.question}</div>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-white/70">{r.blockingDecision.why}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-[13px]">
            Decision owner: <span className="font-medium">{r.blockingDecision.owner}</span>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          {r.conflicts.length > 0 && (
            <section>
              <SectionTitle title="Conflicts" meta={`${resolved}/${r.conflicts.length} decided`} />
              <div className="space-y-3">
                {r.conflicts.map((c, i) => (
                  <ConflictCard
                    key={c.id}
                    index={i}
                    conflict={c}
                    comments={byId}
                    brand={brand}
                    choice={review.conflictResolutions[c.id]}
                    onChoose={(choice) => resolveConflict(c.id, choice)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle title="Themes" meta={`${decided}/${r.clusters.length} reviewed`} />
            <div className="space-y-2.5">
              {r.clusters.map((cl, i) => {
                const d = review.decisions[cl.id] ?? "pending";
                const conflicted = r.conflicts.some((c) => c.topic === cl.topic);
                return (
                  <div key={cl.id} style={{ "--i": i } as React.CSSProperties} className={clsx("enter rounded-xl bg-surface p-4 shadow-card", d === "rejected" && "opacity-60")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone={priorityTone[cl.priority]}>{cl.priority}</Badge>
                          <span className="text-[13.5px] font-semibold capitalize">{cl.topic}</span>
                          <span className="text-[12px] text-muted">{cl.summary}</span>
                        </div>
                        <p className={clsx("text-[13.5px] leading-relaxed", conflicted ? "text-muted" : "text-ink-2")}>{cl.action}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cl.commentIds.map((id) => {
                            const c = byId.get(id);
                            return c ? (
                              <span key={id} title={c.text} className="rounded bg-sunken px-1.5 py-0.5 text-[11px] text-muted">
                                {c.author.split(" ")[0]} · {c.source}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      {!conflicted && (
                        <div className="flex shrink-0 gap-1">
                          <Button size="sm" variant={d === "approved" ? "primary" : "secondary"} icon={<Check className="size-3.5" />} onClick={() => decideReview(cl.id, d === "approved" ? "pending" : "approved")}>
                            {d === "approved" ? "Approved" : "Approve"}
                          </Button>
                          <Button size="sm" variant={d === "rejected" ? "danger" : "ghost"} aria-label="Reject" onClick={() => decideReview(cl.id, d === "rejected" ? "pending" : "rejected")}>
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <SectionTitle title="Comments" meta={r.comments.length} />
            <Card className="divide-y divide-line">
              {r.comments.map((c) => (
                <div key={c.id} className={clsx("flex gap-3 px-4 py-2.5", dupIds.has(c.id) && "bg-sunken/50")}>
                  <div className="w-28 shrink-0">
                    <div className="truncate text-[12.5px] font-medium">{c.author}</div>
                    <div className="truncate text-[11px] text-faint">{c.role}</div>
                  </div>
                  <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">{c.text}</div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] text-muted">{c.source}</span>
                    <span className="rounded bg-sunken px-1.5 text-[10.5px] text-muted capitalize">
                      {c.topic}
                      {dupIds.has(c.id) ? " · dup" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </div>

        <aside className="lg:sticky lg:top-8">
          <BriefPreview review={review} markdown={markdown} onApprove={approve} />
          <Card className="mt-4 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium">
              <Timer className="size-3.5 text-accent" /> Pilot metric
            </div>
            <div className="space-y-1.5 text-[12.5px] text-ink-2">
              <div className="flex justify-between gap-2">
                <span className="text-muted">Baseline</span>
                <span className="font-medium tabular-nums">{baseline ? `${baseline.days} days` : "Not in evidence"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">This round</span>
                <span className="font-medium tabular-nums">{review.approvedAt ? formatDuration(Date.parse(review.approvedAt) - Date.parse(review.createdAt)) : "In progress"}</span>
              </div>
              {baseline && <p className="pt-1 text-[11.5px] text-faint">Source: approval timeline</p>}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ConflictCard({
  conflict,
  comments,
  brand,
  choice,
  onChoose,
  index,
}: {
  conflict: ReviewResult["conflicts"][number];
  comments: Map<string, ReviewComment>;
  brand: BrandKit;
  choice: string | undefined;
  onChoose: (c: string) => void;
  index: number;
}) {
  const involved = conflict.commentIds.map((id) => {
    const c = comments.get(id);
    if (c) return c;
    const n = Number(id.match(/^brand-(\d+)/)?.[1]);
    return n
      ? ({ id, author: "Brand book", role: "Guideline", source: "Brand kit", text: brand.guidelines[n - 1] ?? "", topic: conflict.topic, direction: "keep" } as ReviewComment)
      : null;
  }).filter(Boolean) as ReviewComment[];

  const sides = [...new Map(involved.map((c) => [c.direction, c])).values()];
  const options = [
    ...sides.map((c) => {
      const authors = [...new Set(involved.filter((x) => x.direction === c.direction).map((x) => x.author.split(" ")[0]))].join(" & ");
      return `Go with ${authors} — ${directionPhrase[c.direction.toLowerCase()] ?? c.direction}`;
    }),
    `Escalate to ${conflict.suggestedOwner}`,
  ];

  return (
    <div style={{ "--i": index } as React.CSSProperties} className={clsx("enter rounded-xl bg-surface p-4", choice ? "shadow-card" : "shadow-[0_0_0_1.5px_var(--color-human),var(--shadow-card)]")}>
      <div className="mb-1 flex items-center gap-2">
        <Badge tone="human">Conflict</Badge>
        <span className="text-[13.5px] font-semibold">{conflict.decisionNeeded}</span>
      </div>
      <p className="mb-3 text-[13px] text-muted">{conflict.description}</p>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {involved.slice(0, 4).map((c) => (
          <div key={c.id} className="rounded-lg bg-sunken/60 px-3 py-2">
            <div className="text-[11.5px] font-medium text-ink-2">
              {c.author} <span className="font-normal text-faint">· {c.source}</span>
            </div>
            <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">“{c.text}”</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChoose(o)}
            className={clsx("pressable rounded-lg px-2.5 py-1.5 text-[12.5px]", choice === o ? "bg-ink text-white" : "bg-sunken text-ink-2 hover:bg-line-strong/50")}
          >
            {choice === o && <Check className="mr-1 inline size-3" />}
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function BriefPreview({ review, markdown, onApprove }: { review: ReviewState; markdown: string; onApprove: () => void }) {
  const r = review.result;
  const approved = r.clusters.filter((c) => review.decisions[c.id] === "approved");
  const pending = r.clusters.filter((c) => !review.decisions[c.id] || review.decisions[c.id] === "pending").filter((c) => !r.conflicts.some((x) => x.topic === c.topic));
  const unresolved = r.conflicts.filter((c) => !review.conflictResolutions[c.id]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-sunken/50 px-4 py-3">
        <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">Revision brief</div>
        <div className="mt-0.5 text-[14px] font-semibold">{r.revisionBrief.title}</div>
      </div>
      <div className="max-h-[52vh] space-y-4 overflow-y-auto px-4 py-4 text-[12.5px] leading-relaxed scrollbar-thin">
        <p className="text-ink-2">{r.revisionBrief.objective}</p>
        <div>
          <div className="mb-1.5 font-medium">Changes ({approved.length})</div>
          {approved.length === 0 && <p className="text-faint">No approved changes yet</p>}
          <ol className="list-decimal space-y-1.5 pl-4 text-ink-2">
            {approved.map((c) => (
              <li key={c.id}>{c.action}</li>
            ))}
            {r.conflicts
              .filter((c) => review.conflictResolutions[c.id])
              .map((c) => (
                <li key={c.id}>
                  <span className="font-medium capitalize">{c.topic}:</span> {review.conflictResolutions[c.id]}
                </li>
              ))}
          </ol>
          {pending.length > 0 && <p className="mt-2 text-[11.5px] text-faint">{pending.length} theme(s) awaiting review</p>}
        </div>
        {r.revisionBrief.keep.length > 0 && (
          <div>
            <div className="mb-1.5 font-medium">Keep</div>
            <ul className="space-y-1 text-ink-2">
              {r.revisionBrief.keep.map((k) => (
                <li key={k}>• {k}</li>
              ))}
            </ul>
          </div>
        )}
        {unresolved.length > 0 && (
          <div>
            <div className="mb-1.5 font-medium text-human">Open decisions ({unresolved.length})</div>
            <ul className="space-y-1 text-ink-2">
              {unresolved.map((c) => (
                <li key={c.id}>
                  • {c.decisionNeeded} <span className="text-muted">→ {c.suggestedOwner}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="space-y-2 border-t border-line p-3">
        {review.approvedAt ? (
          <div className="flex items-center gap-2 rounded-lg bg-good-soft px-3 py-2 text-[12.5px] font-medium text-good">
            <Check className="size-3.5" /> Approved — sent to designer
          </div>
        ) : (
          <HumanGate>Needs approval before it reaches the designer.</HumanGate>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" variant="primary" disabled={approved.length === 0} onClick={onApprove} icon={<ClipboardCopy className="size-3.5" />}>
            {review.approvedAt ? "Re-approve & copy" : "Approve brief"}
          </Button>
          <Button
            variant="secondary"
            aria-label="Copy Markdown"
            onClick={() => {
              navigator.clipboard?.writeText(markdown);
              toast("Brief copied as Markdown");
            }}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function buildBrief(review: ReviewState): string {
  const r = review.result;
  const approved = r.clusters.filter((c) => review.decisions[c.id] === "approved");
  const decided = r.conflicts.filter((c) => review.conflictResolutions[c.id]);
  const open = r.conflicts.filter((c) => !review.conflictResolutions[c.id]);
  return [
    `# ${r.revisionBrief.title}`,
    "",
    r.revisionBrief.objective,
    "",
    "## Changes",
    ...approved.map((c, i) => `${i + 1}. ${c.action}`),
    ...decided.map((c, i) => `${approved.length + i + 1}. **${c.topic}** — ${review.conflictResolutions[c.id]}`),
    "",
    "## Keep",
    ...r.revisionBrief.keep.map((k) => `- ${k}`),
    ...(open.length ? ["", "## Open decisions", ...open.map((c) => `- ${c.decisionNeeded} → ${c.suggestedOwner}`)] : []),
    "",
    "_Consolidated with CreativeOps Radar · approved by a human reviewer_",
  ].join("\n");
}
