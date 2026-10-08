"use client";

import clsx from "clsx";
import { AlertOctagon, AlertTriangle, Check, ShieldCheck, Wand2, X } from "lucide-react";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { applyFixes, checkCopy } from "@/lib/brandcheck";
import type { LaunchAsset } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import type { BrandKit, Decision } from "@/lib/types";

export function AssetCard({ asset, decision, brand, index }: { asset: LaunchAsset; decision: Decision; brand: BrandKit; index: number }) {
  const editAsset = useStore((s) => s.editAsset);
  const decideAsset = useStore((s) => s.decideAsset);
  const [headline, setHeadline] = useState(asset.headline);
  const [body, setBody] = useState(asset.body);

  const issues = checkCopy(`${headline}\n${body}\n${asset.cta}`, brand, [
    { field: "Headline", value: headline, limit: asset.headlineLimit },
    { field: "Body", value: body, limit: asset.bodyLimit },
  ]);
  const blocking = issues.filter((i) => i.severity === "block");
  const fixable = brand.claimRules.some((r) => r.avoid && `${headline} ${body}`.toLowerCase().includes(r.avoid.toLowerCase()));

  function commit(patch: { headline?: string; body?: string }) {
    if ((patch.headline ?? asset.headline) !== asset.headline || (patch.body ?? asset.body) !== asset.body) editAsset(asset.id, patch);
  }

  return (
    <div
      style={{ "--i": index } as React.CSSProperties}
      className={clsx(
        "enter flex flex-col overflow-hidden rounded-xl bg-surface",
        decision === "approved" || decision === "edited" ? "shadow-[0_0_0_1.5px_var(--color-good),var(--shadow-card)]" : "shadow-card",
        decision === "rejected" && "opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="text-[14px] font-semibold tracking-tight">{asset.channel}</div>
          <div className="text-[11.5px] text-muted">
            {asset.format} · {asset.dimensions}
          </div>
        </div>
        {decision === "approved" && <Badge tone="good">Approved</Badge>}
        {decision === "edited" && <Badge tone="accent">Edited</Badge>}
        {decision === "rejected" && <Badge tone="bad">Rejected</Badge>}
      </div>

      <div className="grid flex-1 gap-4 p-4 sm:grid-cols-[132px_1fr]">
        <AssetPreview asset={{ ...asset, headline, body }} brand={brand} />
        <div className="space-y-3">
          <CopyField label="Headline" value={headline} limit={asset.headlineLimit} onChange={setHeadline} onBlur={() => commit({ headline })} />
          <CopyField label="Body" value={body} limit={asset.bodyLimit} onChange={setBody} onBlur={() => commit({ body })} multiline />
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-muted">CTA</span>
            <span className="rounded-md bg-sunken px-2 py-0.5 font-medium">{asset.cta}</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-faint">{asset.notes}</p>
        </div>
      </div>

      <div className="border-t border-line px-4 py-3">
        {issues.length === 0 ? (
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-good">
            <ShieldCheck className="size-3.5" /> Passes brand rules & channel specs
          </div>
        ) : (
          <ul className="space-y-1">
            {issues.map((iss, i) => (
              <li key={i} className={clsx("flex items-start gap-1.5 text-[12px]", iss.severity === "block" ? "text-bad" : "text-warn")}>
                {iss.severity === "block" ? <AlertOctagon className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
                <span>
                  <span className="font-medium">{iss.rule}:</span> {iss.detail} {iss.fix && <span className="text-muted">{iss.fix}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={decision === "approved" || decision === "edited" ? "primary" : "secondary"}
            disabled={blocking.length > 0}
            title={blocking.length ? "Resolve blocking brand issues first" : undefined}
            icon={<Check className="size-3.5" />}
            onClick={() => decideAsset(asset.id, decision === "approved" ? "pending" : "approved")}
          >
            {decision === "approved" || decision === "edited" ? "Approved" : "Approve"}
          </Button>
          <Button size="sm" variant={decision === "rejected" ? "danger" : "ghost"} icon={<X className="size-3.5" />} onClick={() => decideAsset(asset.id, decision === "rejected" ? "pending" : "rejected")}>
            Reject
          </Button>
          {fixable && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Wand2 className="size-3.5" />}
              onClick={() => {
                const h = applyFixes(headline, brand);
                const b = applyFixes(body, brand);
                setHeadline(h);
                setBody(b);
                editAsset(asset.id, { headline: h, body: b });
              }}
            >
              Apply approved claims
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyField({ label, value, limit, onChange, onBlur, multiline }: { label: string; value: string; limit: number; onChange: (v: string) => void; onBlur: () => void; multiline?: boolean }) {
  const over = limit > 0 && value.length > limit;
  const cls =
    "w-full resize-none rounded-md bg-transparent px-2 py-1 -mx-2 text-ink outline-none transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--color-line-strong)] focus:shadow-[0_0_0_1px_var(--color-accent),0_0_0_3px_var(--color-accent-soft)]";
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[11px]">
        <span className="font-medium tracking-wide text-muted uppercase">{label}</span>
        <span className={clsx("tabular-nums", over ? "font-medium text-warn" : "text-faint")}>
          {value.length}/{limit}
        </span>
      </div>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} rows={3} className={clsx(cls, "text-[13px] leading-relaxed")} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={clsx(cls, "text-[14px] font-semibold")} />
      )}
    </div>
  );
}

function AssetPreview({ asset, brand }: { asset: LaunchAsset; brand: BrandKit }) {
  const dims = asset.dimensions.match(/(\d+)\s*[×x]\s*(\d+)/);
  const ratio = dims ? Number(dims[1]) / Number(dims[2]) : 1.6;
  const clamped = Math.min(1.9, Math.max(0.5, ratio));
  const field = brand.colors.find((c) => /fog|background/i.test(c.name + c.usage))?.hex ?? brand.colors[1]?.hex ?? "#EEEAE2";
  const ink = brand.colors[0]?.hex ?? "#1F3D2B";
  const atmosphere = brand.colors[4]?.hex ?? brand.colors[2]?.hex ?? "#A7C4CF";

  return (
    <div className="flex items-start justify-center">
      <div
        className="relative w-full overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--color-line)]"
        style={{ aspectRatio: clamped, background: `linear-gradient(180deg, ${atmosphere}55 0%, ${field} 62%)`, maxWidth: clamped < 0.8 ? 96 : 132 }}
        aria-label={asset.altText}
        title={asset.altText}
      >
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[22%] h-[30%] w-full opacity-70">
          <path d="M0 40 L18 18 L30 28 L48 8 L64 26 L78 14 L100 32 L100 40 Z" fill={ink} fillOpacity="0.22" />
        </svg>
        <div className="absolute inset-x-2 top-2">
          <div className="line-clamp-3 text-[9px] leading-[1.15] font-semibold" style={{ color: ink }}>
            {asset.headline}
          </div>
        </div>
        <div className="absolute bottom-2 left-2 rounded-[3px] px-1 py-[1px] text-[6.5px] font-semibold" style={{ background: ink, color: field }}>
          {asset.cta}
        </div>
        <div className="absolute right-2 bottom-2 text-[6px] font-bold tracking-wider uppercase" style={{ color: ink }}>
          {brand.logoDataUrl ? <img src={brand.logoDataUrl} alt="" className="h-2.5 w-auto" /> : brand.name.split(" ")[0]}
        </div>
      </div>
    </div>
  );
}
