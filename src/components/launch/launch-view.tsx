"use client";

import clsx from "clsx";
import { Check, Download, Pencil, Rocket, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EngineStamp, HumanGate, useTask } from "@/components/shared";
import { Button, Card, Field, PageHeader, SectionTitle, Skeleton, Textarea } from "@/components/ui";
import { checkCopy } from "@/lib/brandcheck";
import { channelCatalog } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { LaunchState } from "@/lib/types";
import { AssetCard } from "./asset-card";

export function LaunchView() {
  const brand = useStore((s) => s.brand);
  const draft = useStore((s) => s.drafts.launch);
  const setDraft = useStore((s) => s.setDraft);
  const launch = useStore((s) => s.launch);
  const setLaunch = useStore((s) => s.setLaunch);
  const log = useStore((s) => s.log);
  const { run, loading } = useTask("launch");
  const [editing, setEditing] = useState(false);

  async function generate() {
    const res = await run({ input: draft, brand });
    if (!res) return;
    setLaunch({ ...res, input: draft, decisions: {} });
    setEditing(false);
    const flagged = res.result.assets.filter((a) => checkCopy(`${a.headline}\n${a.body}`, brand).some((i) => i.severity === "block")).length;
    log({ workflow: "launch", title: "Channel matrix generated", detail: `${res.result.assets.length} assets · ${flagged} flagged by brand rules` });
  }

  function toggleChannel(c: string) {
    setDraft("launch", { channels: draft.channels.includes(c) ? draft.channels.filter((x) => x !== c) : [...draft.channels, c] });
  }

  const showInput = !launch || editing;

  return (
    <div>
      <PageHeader
        eyebrow="Workflow · Campaign Launch"
        title={
          <>
            One approved idea. <span className="text-muted italic">Every channel, on brand.</span>
          </>
        }
        actions={
          launch && !editing ? (
            <Button variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>
              Edit brief
            </Button>
          ) : null
        }
      >
        Channel adaptation is the most repetitive part of a launch. AI drafts every spec from the approved brief and checks it against your brand book; your
        production designer and copywriter approve each asset.
      </PageHeader>

      {showInput && (
        <Card className="enter mb-10 p-5">
          <div className="grid gap-5">
            <Field label="Approved campaign brief">
              <Textarea value={draft.brief} onChange={(e) => setDraft("launch", { brief: e.target.value })} className="max-h-[380px] min-h-48 font-mono text-[12.5px]" />
            </Field>
            <Field group label="Channels" hint={`${draft.channels.length} selected`}>
              <div className="flex flex-wrap gap-1.5">
                {channelCatalog.map((c) => {
                  const on = draft.channels.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleChannel(c)}
                      className={clsx("pressable inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px]", on ? "bg-ink text-white" : "bg-sunken text-ink-2 hover:bg-line-strong/50")}
                    >
                      {on && <Check className="size-3" />}
                      {c}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="flex justify-end gap-2">
              {editing && (
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
              <Button variant="accent" loading={loading} disabled={draft.brief.trim().length < 20 || !draft.channels.length} onClick={generate} icon={<Rocket className="size-4" />}>
                Generate channel matrix
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {!loading && launch && <LaunchResults launch={launch} />}
    </div>
  );
}

function LaunchResults({ launch }: { launch: LaunchState }) {
  const brand = useStore((s) => s.brand);
  const log = useStore((s) => s.log);
  const r = launch.result;
  const decisions = launch.decisions;
  const approved = r.assets.filter((a) => decisions[a.id] === "approved" || decisions[a.id] === "edited");
  const rejected = r.assets.filter((a) => decisions[a.id] === "rejected").length;
  const pct = Math.round((approved.length / Math.max(r.assets.length, 1)) * 100);

  function exportCsv() {
    const rows = [["channel", "format", "dimensions", "headline", "body", "cta", "alt_text", "status"]];
    for (const a of approved) rows.push([a.channel, a.format, a.dimensions, a.headline, a.body, a.cta, a.altText, decisions[a.id] ?? ""]);
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${r.campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-channel-matrix.csv`;
    link.click();
    URL.revokeObjectURL(url);
    log({ workflow: "launch", title: "Approved assets exported", detail: `${approved.length}/${r.assets.length} assets → CSV handoff` });
    toast.success("Exported approved assets", { description: `${approved.length} rows ready for your DAM or trafficking sheet.` });
  }

  return (
    <div className="space-y-10">
      <Card className="enter p-5">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">Campaign</div>
            <div className="font-display mt-1 text-[30px] leading-tight">{r.campaign.name}</div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{r.campaign.keyMessage}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <Row label="Audience" value={r.campaign.audience} />
              <Row label="Offer" value={r.campaign.offer || "—"} />
              <Row label="CTA" value={r.campaign.cta} />
              <Row label="Tone" value={r.campaign.tone} />
            </dl>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[11.5px] font-medium tracking-wide text-muted uppercase">Mandatories</div>
              <ul className="space-y-1 text-[12.5px] text-ink-2">
                {r.campaign.mandatories.map((m) => (
                  <li key={m}>• {m}</li>
                ))}
              </ul>
            </div>
            {r.risks.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11.5px] font-medium tracking-wide text-muted uppercase">Watch-outs</div>
                <ul className="space-y-1">
                  {r.risks.map((x) => (
                    <li key={x} className="flex gap-1.5 text-[12.5px] text-ink-2">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" /> {x}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <EngineStamp engine={launch.engine} createdAt={launch.createdAt} warning={launch.warning} />
        </div>
      </Card>

      <section>
        <SectionTitle
          eyebrow={`${approved.length} approved · ${rejected} rejected · ${r.assets.length - approved.length - rejected} to review`}
          title="Channel matrix"
          action={
            <Button variant="primary" disabled={!approved.length} onClick={exportCsv} icon={<Download className="size-3.5" />}>
              Export approved
            </Button>
          }
        >
          Edit any line inline. Brand rules re-check as you type; blocking issues must be fixed before approval.
        </SectionTitle>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-good transition-[width] duration-500 ease-[var(--ease-out)]" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {r.assets.map((a, i) => (
            <AssetCard key={`${a.id}-${launch.createdAt}`} asset={a} decision={decisions[a.id] ?? "pending"} brand={brand} index={i} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Card className="p-4">
          <div className="mb-2 text-[13px] font-semibold">Launch checklist</div>
          <ul className="space-y-1.5">
            {r.checklist.map((c) => (
              <li key={c} className="flex gap-2 text-[12.5px] text-ink-2">
                <span className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded border border-line-strong" />
                {c}
              </li>
            ))}
          </ul>
        </Card>
        <HumanGate className="self-start">
          <span className="font-medium">Out of scope by design:</span> nothing publishes to ad platforms automatically, and brand or legal approval is never automated. Export goes
          to your existing DAM or trafficking sheet.
        </HumanGate>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink-2">{value}</dd>
    </div>
  );
}
