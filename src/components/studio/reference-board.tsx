"use client";

import clsx from "clsx";
import { ImagePlus, Link2, StickyNote, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useStore } from "@/lib/store";

export function ReferenceBoard() {
  const references = useStore((s) => s.references);
  const addReference = useStore((s) => s.addReference);
  const removeReference = useStore((s) => s.removeReference);
  const [mode, setMode] = useState<"note" | "link">("note");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await downscale(file, 640);
      addReference({ kind: "image", title: file.name.replace(/\.[^.]+$/, ""), value: dataUrl });
      toast.success("Image pinned to the board");
    } catch {
      toast.error("Could not read that image");
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-sunken p-0.5">
          {(["note", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={clsx("pressable inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12.5px]", mode === m ? "bg-surface font-medium shadow-card" : "text-muted")}
            >
              {m === "note" ? <StickyNote className="size-3.5" /> : <Link2 className="size-3.5" />}
              {m === "note" ? "Note" : "Link"}
            </button>
          ))}
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-8 w-40 flex-none" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "note" ? "What should the team remember?" : "https://"}
          className="h-8 min-w-48 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) {
              addReference({ kind: mode, title: title.trim() || (mode === "note" ? "Note" : new URL(value.startsWith("http") ? value : `https://${value}`).hostname), value: value.trim() });
              setTitle("");
              setValue("");
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!value.trim()}
          onClick={() => {
            addReference({ kind: mode, title: title.trim() || (mode === "note" ? "Note" : "Link"), value: value.trim() });
            setTitle("");
            setValue("");
          }}
        >
          Pin
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])} />
        <Button size="sm" variant="ghost" icon={<ImagePlus className="size-3.5" />} onClick={() => fileRef.current?.click()}>
          Image
        </Button>
      </div>

      <div className="columns-2 gap-2.5 md:columns-4">
        {references.map((r, i) => (
          <div key={r.id} style={{ "--i": i } as React.CSSProperties} className="enter group relative mb-2.5 break-inside-avoid overflow-hidden rounded-xl bg-surface shadow-card">
            {r.kind === "image" ? (
              <img src={r.value} alt={r.title} className="w-full" />
            ) : (
              <div className="p-3">
                <div className="mb-1 flex items-center gap-1 text-[11px] text-muted">
                  {r.kind === "link" ? <Link2 className="size-3" /> : <StickyNote className="size-3" />}
                  {r.title}
                </div>
                {r.kind === "link" ? (
                  <a href={r.value} target="_blank" rel="noreferrer" className="text-[12.5px] break-all text-accent hover:underline">
                    {r.value.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <p className="text-[12.5px] leading-relaxed text-ink-2">{r.value}</p>
                )}
              </div>
            )}
            <button
              type="button"
              aria-label="Remove reference"
              onClick={() => removeReference(r.id)}
              className="pressable absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md bg-surface/90 text-faint opacity-0 shadow-card group-hover:opacity-100 hover:text-bad focus-visible:opacity-100"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function downscale(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
