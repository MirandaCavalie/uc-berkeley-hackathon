"use client";

import clsx from "clsx";
import { AlertTriangle, BadgeCheck, Cpu, FileText, HelpCircle, Sparkle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { runTask } from "@/lib/client";
import { prettyQuote, quoteAppearsIn } from "@/lib/engine/text";
import type { EvidenceQuote, TaskKey, TaskResult } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import type { AnalysisEngine } from "@/lib/types";

export function EngineStamp({ engine, createdAt, warning }: { engine: AnalysisEngine; createdAt: string; warning: string | null }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1">
          {engine.kind === "llm" ? <Sparkle className="size-3.5 text-accent" /> : <Cpu className="size-3.5" />}
          {engine.label}
        </span>
        <span>·</span>
        <span suppressHydrationWarning>{new Date(createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
      {warning && (
        <div className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {warning}
        </div>
      )}
    </div>
  );
}

export function Quote({ quote }: { quote: EvidenceQuote }) {
  const evidence = useStore((s) => s.evidence);
  const source = evidence.find((e) => e.id === quote.evidenceId);
  const verified = source ? quoteAppearsIn(quote.quote, source.content) : false;
  return (
    <figure className="group rounded-lg bg-sunken/60 px-3 py-2">
      <blockquote className="text-[12.5px] leading-relaxed text-ink-2">“{prettyQuote(quote.quote)}”</blockquote>
      <figcaption className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
        <FileText className="size-3" />
        <span className="truncate">{source ? `${source.title} · ${source.source}` : quote.evidenceId}</span>
        {verified ? (
          <span className="inline-flex items-center gap-0.5 text-good" title="Quote found verbatim in the source file">
            <BadgeCheck className="size-3" /> verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-warn" title="Could not find this text in the source — check before relying on it">
            <HelpCircle className="size-3" /> unverified
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export function useTask<K extends TaskKey>(task: K) {
  const [loading, setLoading] = useState(false);
  async function run(payload: unknown): Promise<{ result: TaskResult<K>; engine: AnalysisEngine; warning: string | null; createdAt: string } | null> {
    setLoading(true);
    try {
      const res = await runTask(task, payload);
      if (res.warning) toast.warning("Fell back to the local engine", { description: res.warning });
      return { ...res, createdAt: new Date().toISOString() };
    } catch (e) {
      toast.error("Analysis failed", { description: e instanceof Error ? e.message : String(e) });
      return null;
    } finally {
      setLoading(false);
    }
  }
  return { run, loading };
}

export function HumanGate({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-start gap-2 rounded-lg border border-human/20 bg-human-soft/60 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2", className)}>
      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-human" />
      <div>{children}</div>
    </div>
  );
}
