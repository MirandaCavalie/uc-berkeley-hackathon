"use client";

import clsx from "clsx";
import { AlertOctagon, AlertTriangle, ImagePlus, Plus, ShieldCheck, Trash2, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Field, Input, PageHeader, SectionTitle, Textarea } from "@/components/ui";
import { applyFixes, checkCopy } from "@/lib/brandcheck";
import { isHex, readableOn } from "@/lib/color";
import { useStore } from "@/lib/store";

export function BrandView() {
  const brand = useStore((s) => s.brand);
  const setBrand = useStore((s) => s.setBrand);

  return (
    <div>
      <PageHeader
        eyebrow="Foundation · Brand Kit"
        title={
          <>
            Your brand book, <span className="text-muted italic">as rules AI can follow.</span>
          </>
        }
      >
        References, colors, voice, and claims live in one place. Every workflow reads this kit, and the brand checker enforces it deterministically — no prompt
        can talk its way around a banned word.
      </PageHeader>

      <div className="grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <Card className="p-5">
            <SectionTitle title="Identity" />
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Brand name">
                    <Input value={brand.name} onChange={(e) => setBrand({ name: e.target.value })} />
                  </Field>
                  <Field label="Tagline / platform">
                    <Input value={brand.tagline} onChange={(e) => setBrand({ tagline: e.target.value })} />
                  </Field>
                </div>
                <Field label="Voice">
                  <Textarea value={brand.voice} onChange={(e) => setBrand({ voice: e.target.value })} className="min-h-20" />
                </Field>
                <Field label="Audience">
                  <Textarea value={brand.audience} onChange={(e) => setBrand({ audience: e.target.value })} className="min-h-16" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display typeface">
                    <Input value={brand.typography.display} onChange={(e) => setBrand({ typography: { ...brand.typography, display: e.target.value } })} />
                  </Field>
                  <Field label="Body typeface">
                    <Input value={brand.typography.body} onChange={(e) => setBrand({ typography: { ...brand.typography, body: e.target.value } })} />
                  </Field>
                </div>
              </div>
              <LogoUpload />
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Palette">Used for previews, territory palettes, and off-palette checks.</SectionTitle>
            <div className="space-y-2">
              {brand.colors.map((c, i) => (
                <div key={i} className="grid grid-cols-[44px_110px_1fr_92px_28px] items-center gap-2">
                  <label className="relative block size-11 cursor-pointer overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--color-line)]" style={{ background: isHex(c.hex) ? c.hex : "#fff" }}>
                    <input
                      type="color"
                      value={isHex(c.hex) ? c.hex : "#ffffff"}
                      onChange={(e) => setBrand({ colors: brand.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)) })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label={`Pick ${c.name}`}
                    />
                  </label>
                  <Input value={c.name} onChange={(e) => setBrand({ colors: brand.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  <Input value={c.usage} onChange={(e) => setBrand({ colors: brand.colors.map((x, j) => (j === i ? { ...x, usage: e.target.value } : x)) })} />
                  <Input
                    value={c.hex}
                    onChange={(e) => setBrand({ colors: brand.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })}
                    className={clsx("font-mono text-[12.5px]", !isHex(c.hex) && "text-bad")}
                  />
                  <button
                    type="button"
                    aria-label="Remove color"
                    onClick={() => setBrand({ colors: brand.colors.filter((_, j) => j !== i) })}
                    className="pressable grid size-7 place-items-center rounded-md text-faint hover:bg-bad-soft hover:text-bad"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-3" icon={<Plus className="size-3.5" />} onClick={() => setBrand({ colors: [...brand.colors, { name: "New", hex: "#888888", usage: "" }] })}>
              Add color
            </Button>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Rules">The checker blocks banned words and unapproved claims, and warns on voice and spec issues.</SectionTitle>
            <div className="space-y-6">
              <ChipEditor label="Banned words" values={brand.bannedWords} onChange={(bannedWords) => setBrand({ bannedWords })} />
              <div>
                <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Approved claims</div>
                <div className="space-y-2">
                  {brand.claimRules.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_1fr_28px] items-center gap-2">
                      <Input value={r.avoid} placeholder="Avoid" onChange={(e) => setBrand({ claimRules: brand.claimRules.map((x, j) => (j === i ? { ...x, avoid: e.target.value } : x)) })} />
                      <span className="text-[12px] text-faint">→</span>
                      <Input value={r.use} placeholder="Use instead" onChange={(e) => setBrand({ claimRules: brand.claimRules.map((x, j) => (j === i ? { ...x, use: e.target.value } : x)) })} />
                      <button
                        type="button"
                        aria-label="Remove rule"
                        onClick={() => setBrand({ claimRules: brand.claimRules.filter((_, j) => j !== i) })}
                        className="pressable grid size-7 place-items-center rounded-md text-faint hover:bg-bad-soft hover:text-bad"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="size-3.5" />} onClick={() => setBrand({ claimRules: [...brand.claimRules, { avoid: "", use: "" }] })}>
                  Add claim rule
                </Button>
              </div>
              <div>
                <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Guidelines</div>
                <div className="space-y-2">
                  {brand.guidelines.map((g, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Textarea value={g} onChange={(e) => setBrand({ guidelines: brand.guidelines.map((x, j) => (j === i ? e.target.value : x)) })} className="min-h-0 py-2" rows={1} />
                      <button
                        type="button"
                        aria-label="Remove guideline"
                        onClick={() => setBrand({ guidelines: brand.guidelines.filter((_, j) => j !== i) })}
                        className="pressable mt-1.5 grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-bad-soft hover:text-bad"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="size-3.5" />} onClick={() => setBrand({ guidelines: [...brand.guidelines, ""] })}>
                  Add guideline
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8">
          <BrandPreview />
          <CheckPlayground />
        </aside>
      </div>
    </div>
  );
}

function BrandPreview() {
  const brand = useStore((s) => s.brand);
  const field = brand.colors[1]?.hex ?? "#EEEAE2";
  const ink = brand.colors[0]?.hex ?? "#1F3D2B";
  return (
    <div className="overflow-hidden rounded-2xl shadow-card" style={{ background: isHex(field) ? field : "#fff" }}>
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          {brand.logoDataUrl ? <img src={brand.logoDataUrl} alt="" className="h-6 w-auto" /> : <span className="text-[12px] font-bold tracking-[0.18em] uppercase" style={{ color: ink }}>{brand.name}</span>}
        </div>
        <div className="font-display text-[34px] leading-[1.05]" style={{ color: ink }}>
          {brand.tagline}
        </div>
        <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed opacity-80" style={{ color: brand.colors[3]?.hex ?? ink }}>
          {brand.voice.split(".").slice(0, 2).join(".")}.
        </p>
      </div>
      <div className="flex h-10">
        {brand.colors.map((c, i) => (
          <div key={i} className="grid flex-1 place-items-center font-mono text-[9.5px]" style={{ background: isHex(c.hex) ? c.hex : "#fff", color: isHex(c.hex) ? readableOn(c.hex) : "#000" }}>
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckPlayground() {
  const brand = useStore((s) => s.brand);
  const [text, setText] = useState("The warmest, most epic jacket ever!! Made with 75% recycled down. GUARANTEED to keep you out longer.");
  const issues = checkCopy(text, brand);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] font-semibold">Brand check playground</div>
        {issues.length === 0 ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-good">
            <ShieldCheck className="size-3.5" /> On brand
          </span>
        ) : (
          <span className="text-[12px] text-muted">{issues.length} issue{issues.length > 1 ? "s" : ""}</span>
        )}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-24 text-[13px]" />
      <ul className="mt-3 space-y-1.5">
        {issues.map((iss, i) => (
          <li key={i} className={clsx("flex items-start gap-1.5 text-[12.5px]", iss.severity === "block" ? "text-bad" : "text-warn")}>
            {iss.severity === "block" ? <AlertOctagon className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
            <span>
              <span className="font-medium">{iss.rule}:</span> {iss.detail} {iss.fix && <span className="text-muted">{iss.fix}</span>}
            </span>
          </li>
        ))}
      </ul>
      {brand.claimRules.some((r) => r.avoid && text.toLowerCase().includes(r.avoid.toLowerCase())) && (
        <Button size="sm" variant="ghost" className="mt-2" icon={<Wand2 className="size-3.5" />} onClick={() => setText(applyFixes(text, brand))}>
          Apply approved claims
        </Button>
      )}
    </Card>
  );
}

function ChipEditor({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim().toLowerCase();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{label}</div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg p-2 shadow-[0_0_0_1px_var(--color-line-strong)]">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-bad-soft py-0.5 pr-1 pl-2 text-[12px] text-bad">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="pressable rounded p-0.5 hover:bg-bad/10">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder="Add word…"
          className="min-w-24 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-faint"
        />
      </div>
    </div>
  );
}

function LogoUpload() {
  const brand = useStore((s) => s.brand);
  const setBrand = useStore((s) => s.setBrand);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        aria-label={brand.logoDataUrl ? "Replace logo" : "Upload logo"}
        className="pressable grid size-28 place-items-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-sunken/50 text-muted hover:bg-sunken"
      >
        {brand.logoDataUrl ? <img src={brand.logoDataUrl} alt="Logo" className="max-h-20 max-w-20 object-contain" /> : <ImagePlus className="size-5" />}
      </button>
      <span className="text-[11.5px] text-faint">{brand.logoDataUrl ? "Replace logo" : "Upload logo"}</span>
      {brand.logoDataUrl && (
        <button type="button" className="text-[11.5px] text-bad hover:underline" onClick={() => setBrand({ logoDataUrl: null })}>
          Remove
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 400_000) {
            toast.error("Logo too large", { description: "Use an SVG or PNG under 400 KB." });
            return;
          }
          const reader = new FileReader();
          reader.onload = () => setBrand({ logoDataUrl: String(reader.result) });
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}
