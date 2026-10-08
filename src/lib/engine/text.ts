import type { EvidenceItem } from "../types";
import type { EvidenceQuote } from "../schemas";

export function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows = lines(text);
  if (rows.length < 2 || !rows[0].includes(",")) return [];
  const header = splitCsvRow(rows[0]).map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const cells = splitCsvRow(row);
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
}

function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of row) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function daysBetween(start: string, end: string): number {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0.5, (b - a) / 86_400_000);
}

export function findQuotes(
  evidence: EvidenceItem[],
  keywords: RegExp,
  max = 2,
  preferKinds: EvidenceItem["kind"][] = [],
): EvidenceQuote[] {
  const ranked = [...evidence].sort(
    (a, b) => rank(preferKinds, a.kind) - rank(preferKinds, b.kind),
  );
  const out: EvidenceQuote[] = [];
  for (const ev of ranked) {
    const body = lines(ev.content);
    for (const [i, line] of body.entries()) {
      if (out.length >= max) return out;
      const isTitle = i === 0 && body.length > 1;
      const isCsvHeader = /^[a-z_]+(,[a-z_]+){2,}$/i.test(line);
      if (!isTitle && !isCsvHeader && keywords.test(line) && line.length > 18) {
        out.push({ evidenceId: ev.id, quote: trimQuote(line) });
        break;
      }
    }
  }
  return out;
}

export function countMatches(evidence: EvidenceItem[], keywords: RegExp): number {
  const global = new RegExp(keywords.source, keywords.flags.includes("g") ? keywords.flags : keywords.flags + "g");
  return evidence.reduce((n, ev) => n + (ev.content.match(global)?.length ?? 0), 0);
}

/** Punctuation-insensitive check that a quote really appears in the source text. */
export function quoteAppearsIn(quote: string, source: string): boolean {
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const q = squash(quote.replace(/…$/, ""));
  return q.length > 0 && squash(source).includes(q);
}

export function prettyQuote(quote: string): string {
  return /^[^,]+(,[^,]*){3,}$/.test(quote)
    ? quote
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .join(" · ")
    : quote;
}

export function trimQuote(text: string, max = 180): string {
  const t = text.replace(/^[-*•\d.)\s]+/, "").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

export function truncateWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:—-]+$/, "") + "…";
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function rank(prefer: EvidenceItem["kind"][], kind: EvidenceItem["kind"]) {
  const i = prefer.indexOf(kind);
  return i === -1 ? prefer.length : i;
}
