import clsx from "clsx";

export const BRAND = {
  name: "Fieldwork",
  tagline: "Make work visible. Make AI useful.",
  pitch: "Fieldwork listens to the people doing the work, finds the friction between teams, and turns it into a defensible AI roadmap.",
  purple: "#7161E8",
  amber: "#F0A563",
  ink: "#19182D",
  paper: "#F7F6FB",
} as const;

/** Three field lines and a signal point: the work map becoming a finding. */
export const MARK_FIELD = "M7 7.5h16M7 13h11M7 18.5h7M7 24h5";
export const MARK_DOT = { cx: 23, cy: 22.5, r: 3 } as const;

export function Mark({ size = 24, inverted, className }: { size?: number; inverted?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={clsx("shrink-0", className)} aria-hidden>
      <path d={MARK_FIELD} fill="none" stroke={inverted ? "white" : "var(--color-accent)"} strokeLinecap="round" strokeWidth="3" />
      <circle {...MARK_DOT} fill="var(--color-signal)" />
    </svg>
  );
}

/** The app icon: the mark on a field-purple tile. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={clsx("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <g>
        <path d={MARK_FIELD} fill="none" stroke="white" strokeLinecap="round" strokeWidth="3" />
        <circle {...MARK_DOT} fill="var(--color-signal)" />
      </g>
    </svg>
  );
}

export function Wordmark({ size = 28, inverted, className }: { size?: number; inverted?: boolean; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center", inverted ? "text-white" : "text-ink", className)} style={{ gap: size * 0.28 }}>
      <Mark size={size} inverted={inverted} />
      <span className="font-semibold tracking-[-0.04em]" style={{ fontSize: size * 0.72, lineHeight: 1 }}>
        {BRAND.name}
      </span>
    </span>
  );
}
