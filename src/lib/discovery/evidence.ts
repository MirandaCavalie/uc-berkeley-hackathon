import { dimensions, labels, type Fact, type Message, type WorkRecord, type Workflow, type Quality } from "./schema";

const normalized = (value: string) => value.replace(/\s+/g, " ").trim();
export function grounded(fact: Fact | null, messages: Message[]) {
  return Boolean(fact && fact.citations.length && fact.citations.every(c => {
    const source = messages.find(m => m.id === c.messageId && m.role === "user");
    return source && normalized(source.text).includes(normalized(c.quote));
  }));
}

/** Only exact employee quotes survive. Matching a quote does not prove the interpretation. */
export function auditRecord(input: WorkRecord, messages: Message[]): { record: WorkRecord; quality: Quality } {
  const record = structuredClone(input);
  const flags: string[] = [...record.contradictions];
  for (const key of ["context", "aiUse"] as const) {
    if (record[key] && !grounded(record[key], messages)) { flags.push(`Unverified citation removed: ${key}`); record[key] = null; }
  }
  record.workflows = record.workflows.filter(w => {
    if (!grounded(w.name, messages)) { flags.push("A workflow without a verified name citation was removed."); return false; }
    for (const key of dimensions) if (w[key] && !grounded(w[key], messages)) {
      flags.push(`Unverified citation removed: ${w.name.value} / ${labels[key]}`); w[key] = null;
    }
    if (w.timing && (!grounded({ value: "time", citations: w.timing.citations }, messages) || !w.time || !w.frequency)) {
      flags.push(`Unverified time estimate removed: ${w.name.value}`); w.timing = null;
    }
    if (weeklyHours(w) !== null && weeklyHours(w)! > 168) { flags.push(`Time exceeds 168 hours/week: ${w.name.value}`); w.timing = null; }
    return true;
  });
  const ids = new Set<string>();
  record.workflows.forEach((w, i) => { if (ids.has(w.id)) w.id = `workflow-${i + 1}`; ids.add(w.id); });
  if (record.workflows.reduce((sum, w) => sum + (weeklyHours(w) ?? 0), 0) > 168) flags.push("Combined active time exceeds 168 hours/week; check overlapping tasks and units.");
  const missing = record.workflows.flatMap(w => dimensions.filter(k => !w[k]).map(k => `${w.name.value}: ${labels[k]}`));
  for (const w of record.workflows) if (weeklyHours(w) === null) missing.push(`${w.name.value}: usable active-time estimate (or explicitly unresolved)`);
  if (!record.context) missing.unshift("Role and normal week");
  if (!record.aiUse) missing.push("Current AI use and restrictions");
  if (!record.workflows.length) missing.push("At least one recurring workflow");
  const total = 2 + Math.max(record.workflows.length, 1) * dimensions.length;
  const captured = Number(Boolean(record.context)) + Number(Boolean(record.aiUse)) + record.workflows.reduce((sum, w) => sum + dimensions.filter(k => w[k]).length, 0);
  return { record, quality: { missing, flags, coverage: Math.round(captured / total * 100), ready: missing.length === 0 && flags.length === 0 } };
}

/** Active time only. A daily rate needs the employee's actual working-day count. */
export function weeklyHours(workflow: Workflow): number | null {
  const t = workflow.timing;
  if (!t || (t.period === "day" && t.daysPerWeek === null)) return null;
  const runs = t.runsPerPeriod * (t.period === "day" ? t.daysPerWeek! : t.period === "month" ? 1 / 4.33 : 1);
  return Math.round(t.minutesPerRun / 60 * runs * 100) / 100;
}
