"use client";

import clsx from "clsx";
import { ArrowUpRight, Check, Lightbulb, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { EngineStamp, HumanGate, useTask } from "@/components/shared";
import { Badge, Button, Card, Empty, Field, Input, PageHeader, SectionTitle, Skeleton, Textarea } from "@/components/ui";
import { isHex, readableOn } from "@/lib/color";
import type { Territory } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import { ReferenceBoard } from "./reference-board";

const riskTone = { safe: "good", stretch: "warn", bold: "human" } as const;

export function StudioView() {
  const brand = useStore((s) => s.brand);
  const references = useStore((s) => s.references);
  const draft = useStore((s) => s.drafts.studio);
  const setDraft = useStore((s) => s.setDraft);
  const studio = useStore((s) => s.studio);
  const setStudio = useStore((s) => s.setStudio);
  const chooseTerritory = useStore((s) => s.chooseTerritory);
  const launchDraft = useStore((s) => s.drafts.launch);
  const log = useStore((s) => s.log);
  const { run, loading } = useTask("studio");

  async function explore() {
    const res = await run({ input: draft, brand, references });
    if (!res) return;
    setStudio({ ...res, input: draft, chosenId: null, pinned: [] });
    log({ workflow: "studio", title: "Territories explored", detail: res.result.territories.map((t) => t.name).join(" · ") });
  }

  function choose(t: Territory) {
    const already = studio?.chosenId === t.id;
    chooseTerritory(already ? null : t.id);
    if (!already) {
      log({ workflow: "studio", title: "Creative direction chosen by the team", detail: `${t.name} (${t.riskLevel})` });
      toast.success(`“${t.name}” chosen`, {
        description: "Send it to Campaign Launch to carry the direction into channel drafts.",
        action: {
          label: "Add to brief",
          onClick: () => {
            const line = `\n\nCreative direction\n${t.name}: ${t.idea}`;
            if (!launchDraft.brief.includes(`${t.name}:`)) setDraft("launch", { brief: launchDraft.brief + line });
            toast("Added to the Campaign Launch brief");
          },
        },
      });
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workflow · Creative Studio"
        title={
          <>
            AI widens the options. <span className="text-muted italic">Your team makes the call.</span>
          </>
        }
      >
        Gather references, then let AI propose divergent territories — safe, stretch, and bold — built from your brand system. It’s a sparring partner for the
        creative process, not a replacement for it.
      </PageHeader>

      <section className="mb-10 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <div className="space-y-4">
            <Field label="Creative theme">
              <Textarea value={draft.theme} onChange={(e) => setDraft("studio", { theme: e.target.value })} className="min-h-20" />
            </Field>
            <Field label="Constraints">
              <Input value={draft.constraints} onChange={(e) => setDraft("studio", { constraints: e.target.value })} />
            </Field>
            <Button className="w-full" variant="accent" loading={loading} disabled={draft.theme.trim().length < 3} onClick={explore} icon={<Sparkles className="size-4" />}>
              {studio ? "Explore again" : "Explore territories"}
            </Button>
          </div>
        </Card>
        <div>
          <SectionTitle title="Reference board">Notes, links, and images your team collects. AI reads them as context.</SectionTitle>
          <ReferenceBoard />
        </div>
      </section>

      {loading && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[520px]" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      )}

      {!loading && !studio && (
        <Empty icon={<Sparkles className="size-5" />} title="No territories yet">
          You’ll get three deliberately different directions with palettes, typography, imagery, and reference searches.
        </Empty>
      )}

      {!loading && studio && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <EngineStamp engine={studio.engine} createdAt={studio.createdAt} warning={studio.warning} />
            {studio.chosenId && (
              <Button size="sm" variant="ghost" icon={<Undo2 className="size-3.5" />} onClick={() => chooseTerritory(null)}>
                Clear choice
              </Button>
            )}
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            {studio.result.territories.map((t, i) => (
              <TerritoryCard key={t.id} t={t} index={i} chosen={studio.chosenId === t.id} dimmed={!!studio.chosenId && studio.chosenId !== t.id} onChoose={() => choose(t)} />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold">
                <Lightbulb className="size-4 text-assist" /> Provocations for the team
              </div>
              <ol className="space-y-2.5">
                {studio.result.provocations.map((p, i) => (
                  <li key={p} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
                    <span className="font-display text-[18px] leading-none text-faint">{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </Card>
            <HumanGate className="self-start">
              Territories are starting points. Nothing here is a final asset, and logo explorations never change the primary lockup without Brand Director approval.
            </HumanGate>
          </div>
        </div>
      )}
    </div>
  );
}

function TerritoryCard({ t, index, chosen, dimmed, onChoose }: { t: Territory; index: number; chosen: boolean; dimmed: boolean; onChoose: () => void }) {
  const palette = t.palette.filter((p) => isHex(p.hex));
  return (
    <div
      style={{ "--i": index } as React.CSSProperties}
      className={clsx(
        "enter overflow-hidden rounded-2xl bg-surface transition-opacity duration-200",
        chosen ? "shadow-[0_0_0_2px_var(--color-ink),var(--shadow-raised)]" : "shadow-card",
        dimmed && "opacity-60 hover:opacity-100",
      )}
    >
      <div className="flex h-28">
        {palette.map((p) => (
          <button
            key={p.hex + p.role}
            type="button"
            title={`${p.name} ${p.hex} — ${p.role}. Click to copy.`}
            onClick={() => {
              navigator.clipboard?.writeText(p.hex);
              toast(`Copied ${p.hex}`, { description: `${p.name} · ${p.role}` });
            }}
            className="group relative flex-1 transition-[flex-grow] duration-300 ease-[var(--ease-out)] hover:flex-[1.6]"
            style={{ background: p.hex }}
          >
            <span className="absolute bottom-1.5 left-2 font-mono text-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ color: readableOn(p.hex) }}>
              {p.hex}
            </span>
          </button>
        ))}
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <Badge tone={riskTone[t.riskLevel]}>{t.riskLevel}</Badge>
          <span className="text-[11px] text-faint">{t.brandFit}</span>
        </div>
        <h3 className="font-display text-[28px] leading-tight">{t.name}</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{t.idea}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{t.why}</p>

        <div className="mt-4 flex flex-wrap gap-1">
          {t.moodWords.map((w) => (
            <span key={w} className="rounded-full bg-sunken px-2 py-0.5 text-[11.5px] text-ink-2">
              {w}
            </span>
          ))}
        </div>

        <dl className="mt-4 space-y-3 text-[12.5px]">
          <Detail label="Typography" value={t.typography} />
          <Detail label="Imagery" value={t.imageryDirection} />
          <div>
            <dt className="mb-1 text-[11px] font-medium tracking-wide text-muted uppercase">Reference searches</dt>
            <dd className="flex flex-col gap-1">
              {t.referenceQueries.map((q) => (
                <a
                  key={q}
                  href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  {q} <ArrowUpRight className="size-3" />
                </a>
              ))}
            </dd>
          </div>
          {t.logoExplorations.length > 0 && <Detail label="Brand explorations" value={t.logoExplorations.join(" ")} />}
        </dl>

        <Button className="mt-5 w-full" variant={chosen ? "primary" : "secondary"} onClick={onChoose} icon={chosen ? <Check className="size-3.5" /> : undefined}>
          {chosen ? "Chosen by the team" : "Choose this direction"}
        </Button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-0.5 text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="leading-relaxed text-ink-2">{value}</dd>
    </div>
  );
}
