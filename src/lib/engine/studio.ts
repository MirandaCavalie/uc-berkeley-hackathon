import type { BrandKit, Reference, StudioInput } from "../types";
import type { StudioResult, Territory } from "../schemas";
import { shift } from "../color";

interface Archetype {
  key: string;
  name: string;
  affinity: RegExp;
  risk: Territory["riskLevel"];
  idea: (theme: string) => string;
  why: string;
  moodWords: string[];
  typography: string;
  imagery: string;
  queries: string[];
  logo: string[];
  palette: (brand: BrandKit) => Territory["palette"];
}

const color = (brand: BrandKit, i: number, fallback: string) => brand.colors[i]?.hex ?? fallback;

const archetypes: Archetype[] = [
  {
    key: "quiet",
    name: "Quiet Hours",
    affinity: /\b(quiet|still|calm|silence|peace|slow|minimal)\w*/i,
    risk: "safe",
    idea: (t) => `Hold the frame on the moment after everyone leaves. ${firstClause(t)} — told through negative space, long exposures, and almost no copy.`,
    why: "Extends the existing platform. Lowest risk to brand equity and easiest for stakeholders to approve.",
    moodWords: ["stillness", "dawn light", "breath", "negative space", "restraint"],
    typography: "Display set small and wide, generous tracking; body in a single weight.",
    imagery: "Wide, cool-toned landscapes with one human figure; product in natural use, never posed.",
    queries: ["long exposure alpine dawn minimal", "lone hiker negative space editorial", "fog layered ridgelines photography"],
    logo: ["Lockup unchanged; explore a seasonal horizon-line rule under the wordmark (brand approval required)."],
    palette: (b) => [
      { hex: color(b, 1, "#EEEAE2"), name: b.colors[1]?.name ?? "Fog", role: "Field" },
      { hex: color(b, 0, "#1F3D2B"), name: b.colors[0]?.name ?? "Pine", role: "Ink" },
      { hex: color(b, 4, "#A7C4CF"), name: b.colors[4]?.name ?? "Glacier", role: "Atmosphere" },
      { hex: color(b, 3, "#34342F"), name: b.colors[3]?.name ?? "Granite", role: "Text" },
    ],
  },
  {
    key: "field",
    name: "Field Notes",
    affinity: /\b(real|people|story|honest|journal|community|document)\w*/i,
    risk: "stretch",
    idea: (t) => `Real trip logs from people who stayed out longest — handwritten temperatures, times, and routes over raw photography. ${firstClause(t)}, proven by notes rather than claims.`,
    why: "Turns product truth into storytelling without superlatives, which also sidesteps claim-substantiation issues.",
    moodWords: ["documentary", "handwritten", "grain", "proof", "trail-worn"],
    typography: "Display paired with a handwritten annotation layer; monospace for data (temps, times, elevation).",
    imagery: "35mm documentary photography; annotations, maps, and gear close-ups with real wear.",
    queries: ["expedition journal annotated photography", "35mm documentary hiking grain", "handwritten field notes design layout"],
    logo: ["Stamp-style secondary mark for annotation overlays — never replaces the primary lockup."],
    palette: (b) => [
      { hex: shift(color(b, 1, "#EEEAE2"), 0, -5, -4), name: "Paper", role: "Field" },
      { hex: color(b, 3, "#34342F"), name: b.colors[3]?.name ?? "Granite", role: "Ink" },
      { hex: color(b, 2, "#D9622B"), name: b.colors[2]?.name ?? "Ember", role: "Annotation (≤10%)" },
      { hex: color(b, 0, "#1F3D2B"), name: b.colors[0]?.name ?? "Pine", role: "Brand" },
    ],
  },
  {
    key: "lastout",
    name: "The Last Ones Out",
    affinity: /\b(longer|night|cold|endur\w*|bold|dark|stay)\b/i,
    risk: "bold",
    idea: (t) => `Shoot after dark: headlamps, frost, and the people still out there when the trail empties. ${firstClause(t)} — the quiet is earned, and the product is why they can stay.`,
    why: "High contrast stops the scroll and makes the product the hero, answering Performance's need without going loud in tone.",
    moodWords: ["blue hour", "headlamp glow", "frost", "contrast", "earned"],
    typography: "Condensed display at large scale, tight leading; minimal body copy.",
    imagery: "Night and blue-hour photography, single light source, product catching the light at ≥40% of frame.",
    queries: ["blue hour mountain headlamp photography", "night hiking frost cinematic", "single light source outdoor portrait"],
    logo: ["Reversed (light-on-dark) lockup study for night imagery."],
    palette: (b) => [
      { hex: shift(color(b, 0, "#1F3D2B"), 10, -10, -12), name: "Night Pine", role: "Field" },
      { hex: color(b, 4, "#A7C4CF"), name: b.colors[4]?.name ?? "Glacier", role: "Light" },
      { hex: shift(color(b, 2, "#D9622B"), 0, 5, 6), name: "Headlamp", role: "Accent (≤10%)" },
      { hex: color(b, 1, "#EEEAE2"), name: b.colors[1]?.name ?? "Fog", role: "Type" },
    ],
  },
  {
    key: "material",
    name: "Material Truth",
    affinity: /\b(material|fabric|recycl\w*|sustain\w*|craft|made|detail)\b/i,
    risk: "stretch",
    idea: (t) => `Macro textures of fill, seams, and shell — specs become the design system. ${firstClause(t)}, shown at the scale of a stitch.`,
    why: "Speaks to a research-heavy audience and uses approved material claims as visual hooks.",
    moodWords: ["macro", "texture", "precision", "honest specs", "tactile"],
    typography: "Monospace spec labels with a clean grotesk display; grid-led layouts.",
    imagery: "Macro product photography on neutral fields; diagram callouts.",
    queries: ["macro textile photography insulation", "technical apparel diagram editorial", "product spec sheet graphic design"],
    logo: ["Small monogram for spec callouts and hang-tags."],
    palette: (b) => [
      { hex: color(b, 1, "#EEEAE2"), name: b.colors[1]?.name ?? "Fog", role: "Field" },
      { hex: color(b, 3, "#34342F"), name: b.colors[3]?.name ?? "Granite", role: "Ink" },
      { hex: shift(color(b, 0, "#1F3D2B"), 0, 0, 18), name: "Moss", role: "Secondary" },
      { hex: color(b, 2, "#D9622B"), name: b.colors[2]?.name ?? "Ember", role: "Callout (≤10%)" },
    ],
  },
  {
    key: "sound",
    name: "Three Seconds of Silence",
    affinity: /\b(sound|silence|listen|video|tiktok|audio)\w*/i,
    risk: "bold",
    idea: (t) => `An audio-led idea: every video opens with three seconds of real mountain silence before anything happens. ${firstClause(t)} — you hear it before you see it.`,
    why: "Ownable in a category that shouts; designed for sound-on vertical video.",
    moodWords: ["silence", "wind", "breath", "pause", "presence"],
    typography: "Captions as the primary typographic voice; oversized, sparse.",
    imagery: "Static locked-off shots, slow reveals; captions carry the copy.",
    queries: ["locked off landscape video minimal", "ASMR nature wind sound design", "caption-led vertical video design"],
    logo: ["Animated lockup that fades in with the first sound."],
    palette: (b) => [
      { hex: color(b, 3, "#34342F"), name: b.colors[3]?.name ?? "Granite", role: "Field" },
      { hex: color(b, 1, "#EEEAE2"), name: b.colors[1]?.name ?? "Fog", role: "Captions" },
      { hex: color(b, 4, "#A7C4CF"), name: b.colors[4]?.name ?? "Glacier", role: "Atmosphere" },
      { hex: color(b, 0, "#1F3D2B"), name: b.colors[0]?.name ?? "Pine", role: "Brand" },
    ],
  },
];

export function runStudio(input: StudioInput, brand: BrandKit, references: Reference[]): StudioResult {
  const text = `${input.theme} ${input.constraints} ${references.map((r) => r.value).join(" ")}`;
  const scored = archetypes
    .map((a) => ({ a, score: (text.match(new RegExp(a.affinity.source, "gi"))?.length ?? 0) }))
    .sort((x, y) => y.score - x.score);

  const pick = (risk: Territory["riskLevel"]) => scored.find((s) => s.a.risk === risk)?.a;
  const chosen = [pick("safe"), pick("stretch"), pick("bold")].filter(Boolean) as Archetype[];

  const territories: Territory[] = chosen.map((a) => ({
    id: `territory-${a.key}`,
    name: a.name,
    idea: a.idea(input.theme),
    why: a.why,
    moodWords: a.moodWords,
    palette: a.palette(brand),
    typography: `${a.typography} (${brand.typography.display} / ${brand.typography.body})`,
    imageryDirection: a.imagery,
    referenceQueries: a.queries,
    logoExplorations: a.logo,
    riskLevel: a.risk,
    brandFit:
      a.risk === "safe"
        ? "Inside the current brand book."
        : a.risk === "stretch"
          ? "Uses the brand palette in a new mix; needs Brand Director review."
          : "Pushes the palette darker; propose as a seasonal extension.",
  }));

  return {
    territories,
    provocations: [
      "What would this campaign look like with no product shot at all — and what does that tell you about the hero?",
      "Which territory would your competitors never dare to run?",
      `If “${brand.tagline}” were a sound, what would it be?`,
      "What does the audience see in the 3 seconds before they scroll — and does any territory own those seconds?",
    ],
  };
}

function firstClause(text: string): string {
  const c = text.split(/[—–.;]/)[0].trim();
  return c.charAt(0).toUpperCase() + c.slice(1);
}
