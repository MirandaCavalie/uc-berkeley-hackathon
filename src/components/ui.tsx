"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import type { WorkMode } from "@/lib/schemas";
import { modeMeta } from "@/lib/scoring";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2 shadow-[0_1px_0_rgb(255_255_255/0.1)_inset,0_1px_2px_rgb(0_0_0/0.2)]",
  accent: "bg-accent text-white hover:bg-[#3029c4] shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_1px_2px_rgb(59_52_214/0.35)]",
  secondary: "bg-surface text-ink shadow-card hover:bg-[#fbfaf7]",
  ghost: "text-ink-2 hover:bg-sunken",
  danger: "text-bad hover:bg-bad-soft",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "pressable inline-flex select-none items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-7 px-2.5 text-[12.5px]",
        size === "md" && "h-9 px-3.5 text-[13.5px]",
        size === "lg" && "h-11 px-5 text-[14.5px]",
        buttonVariants[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="spin size-3.5" /> : icon}
      {children}
    </button>
  );
}

export function Card({ className, children, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} style={style} className={clsx("rounded-xl bg-surface shadow-card", className)}>
      {children}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "accent" | "good" | "warn" | "bad" | WorkMode;
  className?: string;
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-sunken text-ink-2",
    accent: "bg-accent-soft text-accent",
    good: "bg-good-soft text-good",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    automate: "bg-automate-soft text-automate",
    assist: "bg-assist-soft text-assist",
    human: "bg-human-soft text-human",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium leading-4", tones[tone], className)}>
      {children}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: WorkMode }) {
  return (
    <Badge tone={mode}>
      <span className="size-1.5 rounded-full bg-current" />
      {modeMeta[mode].label}
    </Badge>
  );
}

export function SectionTitle({ eyebrow, title, children, action }: { eyebrow?: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-[11.5px] font-medium tracking-wide text-muted uppercase">{eyebrow}</div>}
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
        {children && <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow: string; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-3xl">
        <div className="mb-2 text-[12px] font-medium tracking-wide text-muted uppercase">{eyebrow}</div>
        <h1 className="font-display text-[40px] leading-[1.05] text-ink md:text-[46px]">{title}</h1>
        {children && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Field({ label, hint, group, children }: { label: string; hint?: string; group?: boolean; children: ReactNode }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className="block" {...(group ? { role: "group", "aria-label": label } : {})}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
        {hint && <span className="text-[11.5px] text-faint">{hint}</span>}
      </div>
      {children}
    </Tag>
  );
}

const inputBase =
  "w-full rounded-lg bg-surface px-3 text-[13.5px] text-ink shadow-[0_0_0_1px_var(--color-line-strong)] outline-none placeholder:text-faint transition-shadow duration-150 focus:shadow-[0_0_0_1px_var(--color-accent),0_0_0_4px_var(--color-accent-soft)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputBase, "h-9", className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(inputBase, "min-h-24 py-2.5 leading-relaxed", className)} />;
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div style={style} className={clsx("shimmer rounded-lg", className)} />;
}

export function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-sunken text-muted">{icon}</div>
      <div className="text-[14.5px] font-medium text-ink">{title}</div>
      {children && <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: WorkMode | "accent" }) {
  const color = tone === "automate" ? "text-automate" : tone === "assist" ? "text-assist" : tone === "human" ? "text-human" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <div>
      <div className="text-[12px] text-muted">{label}</div>
      <div className={clsx("mt-0.5 text-[26px] font-semibold tracking-tight tabular-nums", color)}>{value}</div>
      {sub && <div className="text-[12px] text-faint">{sub}</div>}
    </div>
  );
}

export function ScoreRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 75 ? "var(--color-good)" : value >= 55 ? "var(--color-assist)" : "var(--color-faint)";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sunken)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 700ms var(--ease-out)" }}
        />
      </svg>
      <span className="absolute text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}
