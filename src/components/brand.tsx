import clsx from "clsx";

export const BRAND = {
  name: "Fieldwork",
  tagline: "Find where AI actually helps.",
  pitch:
    "Fieldwork interviews every employee, maps how work really gets done, and turns it into an AI roadmap: what becomes an automation, an AI skill, or an agent, and what stays human.",
} as const;

/** Furrows of a field, and the one spot worth digging. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={clsx("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <path d="M6 12.5c3.3-2 6.7-2 10 0s6.7 2 10 0" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 18c3.3-2 6.7-2 10 0s6.7 2 10 0" fill="none" stroke="rgb(255 255 255 / 0.6)" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 23.5c3.3-2 6.7-2 10 0s6.7 2 10 0" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21.5" cy="8" r="3" fill="var(--color-signal)" />
    </svg>
  );
}

export function Wordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="font-semibold tracking-tight" style={{ fontSize: size * 0.6 }}>
        {BRAND.name}
      </span>
    </span>
  );
}
