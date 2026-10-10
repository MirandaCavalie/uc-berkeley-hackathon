import clsx from "clsx";

export const BRAND = {
  name: "Fieldwork",
  tagline: "Find where AI actually helps.",
  pitch:
    "Fieldwork interviews every employee, maps how work really gets done, and turns it into an AI roadmap: what becomes an automation, an AI skill, or an agent, and what stays human.",
  purple: "#6D45D9",
  amber: "#E9A23B",
  ink: "#13140F",
  paper: "#F4F2EC",
} as const;

/** An F with a full stop: discovery that ends in a finding. Drawn on a 32-unit grid. */
export const MARK_F =
  "M7.5 5h17a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H12v2h8.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H12v6.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 6 25.5v-19A1.5 1.5 0 0 1 7.5 5z";
export const MARK_DOT = { cx: 17, cy: 24, r: 3 } as const;
/** Places the mark optically centered inside a 32-unit tile. */
export const TILE_TRANSFORM = "translate(4 3.6) scale(.75)";

export function Mark({ size = 24, inverted, className }: { size?: number; inverted?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={clsx("shrink-0", className)} aria-hidden>
      <path d={MARK_F} fill={inverted ? "white" : "var(--color-accent)"} />
      <circle {...MARK_DOT} fill="var(--color-signal)" />
    </svg>
  );
}

/** The app icon: the mark on a field-purple tile. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={clsx("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <g transform={TILE_TRANSFORM}>
        <path d={MARK_F} fill="white" />
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
