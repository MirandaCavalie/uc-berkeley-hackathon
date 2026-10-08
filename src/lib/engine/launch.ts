import type { BrandKit, LaunchInput } from "../types";
import type { LaunchAsset, LaunchResult } from "../schemas";
import { lines, slug, truncateWords } from "./text";

interface ChannelSpec {
  channel: string;
  format: string;
  dimensions: string;
  headlineLimit: number;
  bodyLimit: number;
  notes: string;
  style: "short" | "social" | "long" | "search" | "hero" | "poster" | "pro";
}

export const channelSpecs: ChannelSpec[] = [
  { channel: "Instagram feed", format: "Static / carousel", dimensions: "1080×1350", headlineLimit: 40, bodyLimit: 125, notes: "First 125 characters show before “more”.", style: "social" },
  { channel: "Instagram stories", format: "Vertical video", dimensions: "1080×1920", headlineLimit: 30, bodyLimit: 60, notes: "CTA visible in first 2 seconds; keep top/bottom 14% clear.", style: "short" },
  { channel: "TikTok", format: "Vertical video, captioned", dimensions: "1080×1920 (9:16)", headlineLimit: 40, bodyLimit: 100, notes: "Burned-in captions; hook in first second.", style: "short" },
  { channel: "Meta paid social", format: "Single image (14 sizes)", dimensions: "1080×1080 · 1080×1350 · 1200×628 +11", headlineLimit: 40, bodyLimit: 125, notes: "Product ≥40% of frame per brand rule.", style: "social" },
  { channel: "Google display", format: "Responsive display", dimensions: "1200×628 · 300×250 · 728×90", headlineLimit: 30, bodyLimit: 90, notes: "Short headline ≤30 chars, long ≤90.", style: "search" },
  { channel: "Email", format: "Launch email", dimensions: "600px wide", headlineLimit: 50, bodyLimit: 280, notes: "Headline = subject line. No urgency words.", style: "long" },
  { channel: "Paid search", format: "Responsive search ad", dimensions: "Text", headlineLimit: 30, bodyLimit: 90, notes: "Up to 15 headlines; include product name.", style: "search" },
  { channel: "Website hero", format: "Homepage hero", dimensions: "2880×1200 · mobile 1170×1800", headlineLimit: 45, bodyLimit: 160, notes: "One idea; CTA above the fold.", style: "hero" },
  { channel: "Retail poster", format: "In-store poster", dimensions: "24×36 in", headlineLimit: 30, bodyLimit: 80, notes: "Readable from 3 m; no URLs.", style: "poster" },
  { channel: "LinkedIn", format: "Sponsored content", dimensions: "1200×627", headlineLimit: 70, bodyLimit: 150, notes: "Professional tone; lead with the insight.", style: "pro" },
];

export function runLaunch(input: LaunchInput, brand: BrandKit): LaunchResult {
  const b = parseBrief(input.brief, brand);
  const picked = input.channels.length ? input.channels : channelSpecs.slice(0, 5).map((c) => c.channel);

  const benefit = shortBenefit(b.keyMessage);
  const tagline = brand.tagline.replace(/\.$/, "");

  const assets: LaunchAsset[] = picked.map((name, i) => {
    const spec = channelSpecs.find((c) => c.channel === name) ?? {
      channel: name,
      format: "Custom",
      dimensions: "Per placement",
      headlineLimit: 40,
      bodyLimit: 125,
      notes: "Confirm specs with channel owner.",
      style: "social" as const,
    };
    const copy = writeCopy(spec, b, benefit, tagline);
    return {
      id: `asset-${slug(name)}-${i}`,
      channel: spec.channel,
      format: spec.format,
      dimensions: spec.dimensions,
      headline: truncateWords(copy.headline, spec.headlineLimit),
      body: truncateWords(copy.body, spec.bodyLimit),
      cta: b.cta,
      altText: `${b.product} shown ${spec.style === "short" ? "in a vertical frame" : "in a mountain landscape"}, ${brand.colors[0]?.name ?? "brand"} lockup bottom-right.`,
      notes: spec.notes,
      headlineLimit: spec.headlineLimit,
      bodyLimit: spec.bodyLimit,
    };
  });

  return {
    campaign: {
      name: b.name,
      audience: b.audience,
      keyMessage: b.keyMessage,
      offer: b.offer,
      cta: b.cta,
      tone: brand.voice.split(".")[0] + ".",
      mandatories: b.mandatories,
    },
    assets,
    checklist: [
      "Final hero approved before adaptation starts",
      ...b.mandatories.map((m) => `Mandatory: ${m}`),
      "Every asset passes brand-rule check",
      "Legal sign-off on claims (human)",
      "Export with naming convention: campaign_channel_size_v#",
    ],
    risks: [
      ...(b.offer ? [`Offer terms (“${truncateWords(b.offer, 60)}”) need consistent wording across channels.`] : []),
      ...(b.openQuestions.length ? b.openQuestions.map((q) => `Open question in brief: ${q}`) : []),
      "AI-drafted copy is a starting point — a copywriter owns the final line.",
    ],
  };
}

interface ParsedBrief {
  name: string;
  product: string;
  audience: string;
  keyMessage: string;
  offer: string;
  cta: string;
  mandatories: string[];
  openQuestions: string[];
}

function parseBrief(text: string, brand: BrandKit): ParsedBrief {
  const all = lines(text);
  const sections = new Map<string, string[]>();
  let current = "_";
  for (const l of all) {
    const isHeader =
      l.length < 50 && /^[A-Z][\w &()/-]*$/.test(l) && l.split(/\s+/).length <= 5 && !/[.:!?]$/.test(l);
    if (isHeader) {
      current = l.toLowerCase();
      sections.set(current, []);
    } else {
      sections.set(current, [...(sections.get(current) ?? []), l]);
    }
  }
  const section = (re: RegExp) => [...sections.entries()].find(([k]) => re.test(k))?.[1] ?? [];
  const field = (re: RegExp) => all.map((l) => l.match(re)?.[1]).find(Boolean)?.trim();

  const quoted = text.match(/[“"]([^”"]{3,40})[”"]/)?.[1];
  const product = field(/^product:\s*(.+?)(\s*\(|$)/i) ?? brand.name;
  const mandatories = section(/mandator/).map((l) => l.replace(/^[-*•]\s*/, ""));
  const cta = mandatories.map((m) => m.match(/cta:\s*[“"]?([^”"]+)[”"]?/i)?.[1]).find(Boolean) ?? `Shop ${product.split(" ")[0]}`;

  return {
    name: quoted ?? field(/campaign[^:]*:\s*(.+)/i) ?? `${product} launch`,
    product,
    audience: section(/audience/).join(" ") || brand.audience,
    keyMessage: section(/message|proposition/).join(" ") || section(/objective/).join(" ") || brand.tagline,
    offer: section(/offer/).join(" "),
    cta: cta.trim(),
    mandatories,
    openQuestions: section(/open question/).flatMap((l) => l.split(/(?<=\?)\s+/)).filter((q) => q.endsWith("?")),
  };
}

function shortBenefit(message: string): string {
  const clause = message.split(/[—–;,]|\bso\b/)[0].trim();
  return clause.replace(/\.$/, "");
}

function writeCopy(spec: ChannelSpec, b: ParsedBrief, benefit: string, tagline: string) {
  const productShort = b.product.replace(/\s*\(.*\)/, "");
  const offerShort = b.offer ? b.offer.split(/(?<=\.)\s/)[0].replace(/\s*\(.*?\)/g, "").replace(/\.$/, "") : "";
  switch (spec.style) {
    case "short":
      return { headline: `${tagline}.`, body: `${benefit}.` };
    case "search":
      return {
        headline: productShort.length <= spec.headlineLimit ? productShort : productShort.split(" ").slice(0, 2).join(" "),
        body: `${benefit}. ${offerShort ? offerShort + "." : ""}`,
      };
    case "long":
      return {
        headline: `${b.name}: meet ${productShort}`,
        body: `${b.keyMessage} ${offerShort ? offerShort + "." : ""}`,
      };
    case "hero":
      return { headline: `${tagline}.`, body: `${productShort}. ${benefit}.` };
    case "poster":
      return { headline: `${tagline}.`, body: productShort };
    case "pro":
      return { headline: `${b.name}: built to last, made with intent`, body: `${productShort}. ${benefit}.` };
    default:
      return { headline: `${b.name}`, body: `${benefit}.${offerShort ? ` ${offerShort}.` : ""}` };
  }
}
