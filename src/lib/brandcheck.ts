import type { BrandKit } from "./types";

export interface BrandIssue {
  severity: "block" | "warn";
  rule: string;
  detail: string;
  fix: string | null;
}

export function checkCopy(text: string, brand: BrandKit, limits?: { field: string; value: string; limit: number }[]): BrandIssue[] {
  const issues: BrandIssue[] = [];
  const lower = text.toLowerCase();

  for (const rule of brand.claimRules) {
    if (rule.avoid && lower.includes(rule.avoid.toLowerCase())) {
      issues.push({
        severity: "block",
        rule: "Approved claims",
        detail: `“${rule.avoid}” is not an approved claim.`,
        fix: `Use “${rule.use}”.`,
      });
    }
  }

  for (const word of brand.bannedWords) {
    if (!word) continue;
    const re = new RegExp(`\\b${escape(word)}\\b`, "i");
    if (re.test(text) && !brand.claimRules.some((r) => r.avoid.toLowerCase() === word.toLowerCase())) {
      issues.push({ severity: "block", rule: "Banned words", detail: `“${word}” is on the banned list.`, fix: null });
    }
  }

  const exclamations = (text.match(/!/g) ?? []).length;
  if (exclamations > 1) {
    issues.push({ severity: "warn", rule: "Voice", detail: `${exclamations} exclamation marks — the voice is calm and grounded.`, fix: "Keep at most one." });
  }

  const shouting = text.match(/\b[A-Z]{4,}\b/g)?.filter((w) => !["CTA", "HTML", "SKU"].includes(w));
  if (shouting?.length) {
    issues.push({ severity: "warn", rule: "Voice", detail: `All-caps “${shouting[0]}” reads as shouting.`, fix: "Use sentence case." });
  }

  const hexes = text.match(/#[0-9a-f]{6}\b/gi) ?? [];
  const palette = new Set(brand.colors.map((c) => c.hex.toLowerCase()));
  for (const hex of hexes) {
    if (!palette.has(hex.toLowerCase())) {
      issues.push({ severity: "warn", rule: "Palette", detail: `${hex} is outside the brand palette.`, fix: null });
    }
  }

  for (const l of limits ?? []) {
    if (l.limit > 0 && l.value.length > l.limit) {
      issues.push({
        severity: "warn",
        rule: "Channel spec",
        detail: `${l.field} is ${l.value.length}/${l.limit} characters.`,
        fix: "Shorten to fit the placement.",
      });
    }
  }

  return issues;
}

export function applyFixes(text: string, brand: BrandKit): string {
  let out = text;
  for (const rule of brand.claimRules) {
    if (!rule.avoid) continue;
    out = out.replace(new RegExp(escape(rule.avoid), "gi"), rule.use);
  }
  return out;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
