"use client";

import clsx from "clsx";
import { BarChart3, ClipboardList, FileText, GitPullRequestArrow, MessageSquareText, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { EvidenceItem, EvidenceKind } from "@/lib/types";

export const kindMeta: Record<EvidenceKind, { label: string; icon: typeof FileText }> = {
  brief: { label: "Brief", icon: FileText },
  feedback: { label: "Feedback", icon: MessageSquareText },
  approvals: { label: "Approval timeline", icon: GitPullRequestArrow },
  requests: { label: "Requests", icon: ClipboardList },
  performance: { label: "Performance", icon: BarChart3 },
  other: { label: "Other", icon: FileText },
};

export function EvidencePanel() {
  const evidence = useStore((s) => s.evidence);
  const removeEvidence = useStore((s) => s.removeEvidence);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<EvidenceItem | null>(null);

  return (
    <div>
      <div className="-mt-10 mb-3 flex justify-end">
        <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>
          Add evidence
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {evidence.map((e, i) => {
          const Icon = kindMeta[e.kind].icon;
          return (
            <div
              key={e.id}
              style={{ "--i": i } as React.CSSProperties}
              className="enter lift group relative cursor-pointer rounded-xl bg-surface p-3 shadow-card"
              onClick={() => setViewing(e)}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
                  <Icon className="size-3.5" />
                  {kindMeta[e.kind].label}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${e.title}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    removeEvidence(e.id);
                    toast("Evidence removed", { description: e.title });
                  }}
                  className="pressable grid size-6 place-items-center rounded-md text-faint opacity-0 group-hover:opacity-100 hover:bg-bad-soft hover:text-bad focus-visible:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="line-clamp-2 text-[13px] leading-snug font-medium">{e.title}</div>
              <div className="mt-1 text-[11.5px] text-faint">
                {e.source} · {e.content.split(/\n/).filter(Boolean).length} lines
              </div>
            </div>
          );
        })}
        {evidence.length === 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pressable col-span-full rounded-xl border border-dashed border-line-strong p-8 text-[13px] text-muted hover:bg-surface"
          >
            Paste a brief, feedback thread, approval timeline, or request queue to get started.
          </button>
        )}
      </div>

      <AddEvidenceModal open={open} onOpenChange={setOpen} />
      <Modal open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} title={viewing?.title ?? ""} description={viewing ? `${kindMeta[viewing.kind].label} · ${viewing.source}` : ""}>
        <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink-2">{viewing?.content}</pre>
      </Modal>
    </div>
  );
}

function AddEvidenceModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addEvidence = useStore((s) => s.addEvidence);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EvidenceKind>("feedback");
  const [source, setSource] = useState("");
  const [content, setContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setSource("");
    setContent("");
    setKind("feedback");
  }

  async function onFile(file: File) {
    if (file.size > 500_000) {
      toast.error("File too large", { description: "Keep text evidence under 500 KB for now." });
      return;
    }
    const text = await file.text();
    setContent(text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    if (/\.csv$/i.test(file.name) && kind === "feedback") setKind("approvals");
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
      title="Add evidence"
      description=""
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!content.trim() || !title.trim()}
            onClick={() => {
              addEvidence({ title: title.trim(), kind, source: source.trim() || "Pasted", content: content.trim() });
              toast.success("Evidence added", { description: title });
              reset();
              onOpenChange(false);
            }}
          >
            Add to workspace
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q4 launch feedback thread" />
          </Field>
          <Field label="Source">
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Slack, Figma, Asana…" />
          </Field>
        </div>
        <Field group label="Type">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(kindMeta) as EvidenceKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={clsx(
                  "pressable rounded-md px-2.5 py-1 text-[12.5px]",
                  kind === k ? "bg-ink text-white" : "bg-sunken text-ink-2 hover:bg-line-strong/40",
                )}
              >
                {kindMeta[k].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Content" hint="Text, Markdown, or CSV">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-48 font-mono text-[12.5px]" placeholder="Paste the thread, brief, or export here…" />
        </Field>
        <div>
          <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.tsv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <Button size="sm" variant="ghost" icon={<Upload className="size-3.5" />} onClick={() => fileRef.current?.click()}>
            Upload a text file instead
          </Button>
        </div>
      </div>
    </Modal>
  );
}
