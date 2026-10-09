import type { BrandKit, ReviewInput } from "../types";
import type { FeedbackTopic, ReviewComment, ReviewResult } from "../schemas";
import { lines, truncateWords } from "./text";

const topicRules: [FeedbackTopic, RegExp][] = [
  ["legal", /\b(legal|claims?|substantiat\w*|guaranteed|certificate|warmest|recycled (down|fill))\b/i],
  ["cta", /\b(cta|button|call to action|shop now)\b/i],
  ["logo", /\b(logo|lockup)\b/i],
  ["typography", /\b(typeface|font|söhne|inter|serif|kerning)\b/i],
  ["layout", /\b(spacing|layout|alignment|margin|grid|padding)\b/i],
  ["headline", /\b(headline|tagline|title|platform line)\b/i],
  ["color", /\b(colou?rs?|grade|grading|warm\w*|cold|cool|orange|palette|hue|lut)\b/i],
  ["imagery", /\b(product|photo|image|jacket|landscape|frame|crop|shot|9:16|cut|video)\b/i],
  ["copy", /\b(copy|subhead|wording|subject line|caption|text)\b/i],
];

export type Direction =
  | "bigger"
  | "smaller"
  | "keep"
  | "louder"
  | "calmer"
  | "warmer"
  | "cooler"
  | "remove"
  | "replace"
  | "add"
  | "change";

const directionRules: [Direction, RegExp][] = [
  ["keep", /\b(do not|don'?t|never|let'?s not)\s+(\w+\s+){0,2}(enlarge|change|go|touch|move)\b|\b(is correct|keep it|keep the|love the restraint)\b/i],
  ["remove", /\b(remove|cannot run|delete|drop|cut the)\b/i],
  ["calmer", /\b(calm\w*|restraint|quieter|softer|subtle|not go loud)\b/i],
  ["louder", /\b(bolder|louder|too quiet|punchier|more energy|more impact)\b/i],
  ["warmer", /\b(warmer|warm it up|feels cold|too cold|colors? feel cold)\b/i],
  ["cooler", /\b(cooler|too warm|slightly cool|cool colou?r)\b/i],
  ["bigger", /\b(bigger|larger|enlarge|more prominent|feels small|is lost|lost in)\b|\bat least \d+\s?%/i],
  ["smaller", /\b(smaller|reduce|too big|too large|scale down)\b/i],
  ["replace", /\b(replace|instead|should be|must read|use \w+|swap)\b/i],
  ["add", /\b(need|add|include|visible)\b/i],
];

const opposites: [Direction, Direction][] = [
  ["bigger", "smaller"],
  ["bigger", "keep"],
  ["louder", "calmer"],
  ["louder", "keep"],
  ["warmer", "cooler"],
  ["add", "remove"],
];

const dedupable = new Set<Direction>(["bigger", "smaller", "louder", "calmer", "warmer", "cooler", "keep"]);

const directionLabel: Record<Direction, string> = {
  bigger: "make it bigger",
  smaller: "make it smaller",
  keep: "keep as is",
  louder: "go bolder",
  calmer: "keep it calm",
  warmer: "warm it up",
  cooler: "keep it cool",
  remove: "remove",
  replace: "replace",
  add: "add / make visible",
  change: "change",
};

const seniority = [/\b(cmo|chief|vp|head of)\b/i, /\b(director|counsel|legal)\b/i, /\blead\b/i, /\bmanager\b/i];

export type CommentLabels = (text: string) => { topic?: FeedbackTopic; direction?: Direction } | undefined;

export function runReview(input: ReviewInput, brand: BrandKit, labelFor?: CommentLabels): ReviewResult {
  const comments = parseComments(input.feedback, labelFor);

  const guidelineComments: ReviewComment[] = brand.guidelines.map((g, i) => ({
    id: `brand-${i + 1}`,
    author: "Brand book",
    role: "Guideline",
    source: "Brand kit",
    text: g,
    topic: labelFor?.(g)?.topic ?? topicOf(g),
    direction: labelFor?.(g)?.direction ?? directionOf(g),
  }));

  const byTopic = new Map<FeedbackTopic, ReviewComment[]>();
  for (const c of comments) byTopic.set(c.topic, [...(byTopic.get(c.topic) ?? []), c]);

  const conflicts: ReviewResult["conflicts"] = [];
  for (const [topic, list] of byTopic) {
    const pool = [...list, ...guidelineComments.filter((g) => g.topic === topic)];
    const seen = new Set<string>();
    for (const [a, b] of opposites) {
      const left = pool.filter((c) => c.direction === a);
      const right = pool.filter((c) => c.direction === b);
      if (!left.length || !right.length) continue;
      const authorsL = new Set(left.map((c) => c.author));
      const authorsR = new Set(right.map((c) => c.author));
      if ([...authorsL].every((x) => authorsR.has(x))) continue;
      const key = `${topic}:${a}:${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const people = [...left, ...right];
      const named = (xs: ReviewComment[]) => [...new Set(xs.map((c) => c.author))].join(" & ");
      conflicts.push({
        id: `conflict-${conflicts.length + 1}`,
        topic,
        commentIds: people.map((c) => c.id),
        description: `${named(left)} want${authorsL.size > 1 ? "" : "s"} to ${directionLabel[a]}; ${named(right)} ${right.some((c) => c.author === "Brand book") && authorsR.size === 1 ? "says" : authorsR.size > 1 ? "want" : "wants"} to ${directionLabel[b]}.`,
        decisionNeeded: decisionQuestion(topic, a, b),
        suggestedOwner: ownerFor(topic, people, comments),
      });
    }
  }

  const duplicates: ReviewResult["duplicates"] = [];
  for (const [topic, list] of byTopic) {
    if (topic === "legal" || topic === "other") continue;
    const groups = new Map<string, ReviewComment[]>();
    for (const c of list) {
      if (!dedupable.has(c.direction as Direction)) continue;
      groups.set(c.direction, [...(groups.get(c.direction) ?? []), c]);
    }
    for (const [dir, group] of groups) {
      if (group.length < 2) continue;
      const authors = [...new Set(group.map((c) => c.author))];
      duplicates.push({
        commentIds: group.map((c) => c.id),
        note: `${group.length} comments ask to ${directionLabel[dir as Direction]} (${topicLabel(group[0].topic)}) — from ${authors.join(", ")}. Count once.`,
      });
    }
  }

  const conflictTopics = new Set(conflicts.map((c) => c.topic));
  const clusters: ReviewResult["clusters"] = [...byTopic.entries()]
    .map(([topic, list], i) => {
      const authors = [...new Set(list.map((c) => c.author))];
      const priority: "must" | "should" | "could" =
        topic === "legal" || conflictTopics.has(topic) ? "must" : list.length >= 2 || list.some((c) => /\bneed|must\b/i.test(c.text)) ? "should" : "could";
      return {
        id: `cluster-${i + 1}`,
        topic,
        summary: `${list.length} comment${list.length > 1 ? "s" : ""} on ${topicLabel(topic)} from ${authors.join(", ")}.`,
        commentIds: list.map((c) => c.id),
        priority,
        action: actionFor(topic, list, conflictTopics.has(topic)),
      };
    })
    .sort((a, b) => order(a.priority) - order(b.priority) || b.commentIds.length - a.commentIds.length);

  const blocking = [...conflicts].sort((a, b) => conflictWeight(b, comments) - conflictWeight(a, comments))[0];
  const keep = [
    ...comments.filter((c) => c.direction === "keep" || c.direction === "calmer").map((c) => truncateWords(c.text, 110)),
    ...brand.guidelines.slice(0, 2),
  ].slice(0, 4);

  const resolvedChanges = clusters
    .filter((c) => !conflictTopics.has(c.topic))
    .map((c) => ({ change: c.action, rationale: c.summary, clusterId: c.id }));

  return {
    comments,
    clusters,
    conflicts,
    duplicates,
    blockingDecision: blocking
      ? {
          question: blocking.decisionNeeded,
          why: `It touches ${topicLabel(blocking.topic)} on every channel asset. ${blocking.description} Until it is decided, every revision risks another round.`,
          owner: blocking.suggestedOwner,
        }
      : { question: "No blocking conflicts detected.", why: "Feedback is consistent; proceed with the revision brief.", owner: "Design Lead" },
    revisionBrief: {
      title: `Revision brief — ${input.assetName || "asset"}`,
      objective: `Address ${comments.length} comments from ${new Set(comments.map((c) => c.author)).size} reviewers in one round, without re-opening settled decisions.`,
      changes: resolvedChanges,
      keep,
      openQuestions: conflicts.map((c) => `${c.decisionNeeded} → ${c.suggestedOwner}`),
    },
  };
}

export function parseComments(feedback: string, labelFor?: CommentLabels): ReviewComment[] {
  const out: ReviewComment[] = [];
  let source = "Pasted";
  let emailAuthor: { author: string; role: string } | null = null;

  for (const raw of lines(feedback)) {
    const header = raw.match(/^(#?[\w-]+\s+—\s+)?(slack|email|figma|asana|notion|frame\.io|teams|google docs?)\b/i) ?? raw.match(/\b(slack|figma) (export|comments)\b/i);
    if (header && raw.length < 120 && !/:\s/.test(raw.replace(/^.*?(from:)/i, ""))) {
      source = capitalize((header[2] ?? header[1]).toLowerCase());
      emailAuthor = null;
      continue;
    }

    const from = raw.match(/from:\s*([^(·]+?)\s*\(([^)]+)\)/i);
    if (from) {
      source = "Email";
      emailAuthor = { author: from[1].trim(), role: from[2].trim() };
      continue;
    }

    const attributed = raw.match(/^(?:\[[^\]]+\]\s*)?[-*•]?\s*([A-Z][\w.'-]+(?:\s[A-Z][\w.'-]+){0,2})\s*\(([^)]+)\):\s*(.+)$/);
    if (attributed) {
      emailAuthor = null;
      out.push(makeComment(out.length, attributed[1], attributed[2], source, attributed[3], labelFor));
      continue;
    }

    const simple = raw.match(/^(?:\[[^\]]+\]\s*)?[-*•]?\s*([A-Z][\w.'-]+(?:\s[A-Z][\w.'-]+)?):\s*(.{12,})$/);
    if (simple && !/^(subject|re|to|cc)$/i.test(simple[1])) {
      out.push(makeComment(out.length, simple[1], "Reviewer", source, simple[2], labelFor));
      continue;
    }

    const item = raw.match(/^\d+[.)]\s*(.+)$/);
    if (item && emailAuthor) {
      out.push(makeComment(out.length, emailAuthor.author, emailAuthor.role, source, item[1], labelFor));
      continue;
    }

    if (raw.length > 24 && !/^(team|thanks|happy to|subject)/i.test(raw) && !emailAuthor) {
      out.push(makeComment(out.length, "Unattributed", "Reviewer", source, raw.replace(/^[-*•]\s*/, ""), labelFor));
    }
  }
  return out;
}

function makeComment(i: number, author: string, role: string, source: string, text: string, labelFor?: CommentLabels): ReviewComment {
  const labels = labelFor?.(text.trim());
  return {
    id: `c${i + 1}`,
    author: author.trim(),
    role: role.trim(),
    source,
    text: text.trim(),
    topic: labels?.topic ?? topicOf(text),
    direction: labels?.direction ?? directionOf(text),
  };
}

export function topicOf(text: string): FeedbackTopic {
  return topicRules.find(([, re]) => re.test(text))?.[0] ?? "other";
}

export function directionOf(text: string): Direction {
  return directionRules.find(([, re]) => re.test(text))?.[0] ?? "change";
}

function decisionQuestion(topic: FeedbackTopic, a: Direction, b: Direction): string {
  const subject: Record<FeedbackTopic, string> = {
    headline: "Does the hero headline",
    logo: "Does the logo",
    color: "Does the color grade",
    cta: "Does the CTA",
    imagery: "Does the product framing",
    layout: "Does the layout",
    typography: "Does the typography",
    copy: "Does the copy",
    legal: "Does the claim",
    other: "Does this element",
  };
  return `${subject[topic]} ${directionLabel[a]} or ${directionLabel[b]}?`;
}

function ownerFor(topic: FeedbackTopic, people: ReviewComment[], everyone: ReviewComment[]): string {
  const find = (re: RegExp) => people.find((p) => re.test(p.role))?.author;
  const findAny = (re: RegExp) => find(re) ?? everyone.find((p) => re.test(p.role))?.author;
  if (topic === "legal") return find(/legal|counsel/i) ?? "Legal";
  if (["logo", "color", "typography", "headline"].includes(topic)) {
    const brandOwner = findAny(/brand/i);
    const exec = find(/cmo|chief|vp/i);
    if (brandOwner && exec) return `${exec} (with ${brandOwner})`;
    return brandOwner ?? exec ?? "Brand Director";
  }
  if (topic === "imagery" || topic === "cta") return find(/performance/i) ?? find(/cmo|chief/i) ?? "Design Lead";
  return mostSenior(people) ?? "Design Lead";
}

function mostSenior(people: ReviewComment[]): string | null {
  for (const re of seniority) {
    const hit = people.find((p) => re.test(p.role));
    if (hit) return hit.author;
  }
  return null;
}

function conflictWeight(c: ReviewResult["conflicts"][number], comments: ReviewComment[]): number {
  const involved = comments.filter((x) => c.commentIds.includes(x.id));
  const people = [...new Map(involved.map((x) => [x.author, x.role])).values()];
  const senior = people.reduce((s, role) => s + (seniority[0].test(role) ? 3 : seniority.some((re) => re.test(role)) ? 1 : 0), 0);
  const topicWeight = c.topic === "headline" ? 3 : c.topic === "color" || c.topic === "imagery" ? 2 : 1;
  return senior + involved.length + topicWeight;
}

function actionFor(topic: FeedbackTopic, list: ReviewComment[], conflicted: boolean): string {
  if (conflicted) return `Hold ${topicLabel(topic)} changes until the conflict is resolved.`;
  if (topic === "legal") {
    return list.map((c) => truncateWords(c.text.replace(/^\d+[.)]\s*/, ""), 170)).join(" ");
  }
  const byDirection = new Map<string, ReviewComment[]>();
  for (const c of list) byDirection.set(c.direction, [...(byDirection.get(c.direction) ?? []), c]);
  return [...byDirection.values()]
    .map((group) => [...group].sort((a, b) => score(b) - score(a))[0])
    .sort((a, b) => score(b) - score(a))
    .slice(0, 2)
    .map((c) => `${truncateWords(c.text, 120)} (${c.author})`)
    .join(" Also: ");
}

function score(c: ReviewComment) {
  return (c.direction !== "change" ? 2 : 0) + (/\d/.test(c.text) ? 2 : 0) + Math.min(c.text.length / 60, 2);
}

function order(p: "must" | "should" | "could") {
  return p === "must" ? 0 : p === "should" ? 1 : 2;
}

export function topicLabel(t: FeedbackTopic): string {
  const map: Record<FeedbackTopic, string> = {
    logo: "the logo",
    color: "color",
    headline: "the headline",
    copy: "copy",
    cta: "the CTA",
    imagery: "product imagery",
    layout: "layout & spacing",
    typography: "typography",
    legal: "legal & claims",
    other: "other details",
  };
  return map[t];
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
