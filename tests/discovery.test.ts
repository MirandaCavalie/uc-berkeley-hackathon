import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { auditRecord, grounded, weeklyHours } from "../src/lib/discovery/evidence";
import { dimensions, emptyRecord, recordSchema, type Fact, type Message, type WorkRecord } from "../src/lib/discovery/schema";
import { toInterview } from "../src/lib/discovery/export";
import * as storage from "../src/lib/discovery/database";
import { makeInterviewGraph, generate } from "../src/lib/discovery/agent";

const directory = mkdtempSync(join(tmpdir(), "fieldwork-discovery-test-"));
process.env.FIELDWORK_DB_PATH = join(directory, "research.sqlite");
after(() => { storage.db().close(); rmSync(directory, { recursive: true, force: true }); });
const scope = { company: "Test Company", purpose: "Discover repetitive workflows with anonymized examples.", ownerContact: "owner@example.test", retentionDays: 90 };
storage.setConfig("settings", scope);
const source: Message = { id: "employee-1", role: "user", createdAt: new Date().toISOString(), text: "I match invoices. 30 minutes per invoice, 20 invoices a week. I use Excel. A vendor email starts it. PDFs arrive by email. I copy totals, compare the PO, then enter them. The result goes into our ERP. My manager approves anything over $500. When the PO is missing I ask purchasing and wait two days. Mistakes delay payment. I keep a spreadsheet workaround. Yesterday a duplicate invoice arrived and I checked its number before entering it. Approval must stay human. I do not use AI. I work in Accounts Payable." };
const fact = (value: string, quote = source.text): Fact => ({ value, citations: [{ messageId: source.id, quote }] });
function fixture(): WorkRecord {
  const fields = Object.fromEntries(dimensions.map(d => [d, fact(d)])) as Record<typeof dimensions[number], Fact>;
  return { context: fact("Accounts Payable"), aiUse: fact("Does not use AI"), contradictions: [], workflows: [{ id: "invoices", name: fact("Match invoices", "I match invoices."), ...fields, timing: { minutesPerRun: 30, runsPerPeriod: 20, period: "week", daysPerWeek: null, citations: [{ messageId: source.id, quote: "30 minutes per invoice, 20 invoices a week." }] } }] };
}
function session() { return storage.createSession({ name: "Test Employee", email: "employee@example.test", role: "AP Specialist", team: "Finance" }); }

test("time per item is multiplied by reported volume", () => {
  assert.equal(weeklyHours(fixture().workflows[0]), 10);
  const w = fixture().workflows[0]; w.timing = { ...w.timing!, minutesPerRun: 240, runsPerPeriod: 1, period: "day", daysPerWeek: 5 };
  assert.equal(weeklyHours(w), 20);
  w.timing.daysPerWeek = null; assert.equal(weeklyHours(w), null);
  w.timing = { ...w.timing, minutesPerRun: 60, runsPerPeriod: 43.3, period: "month" }; assert.equal(weeklyHours(w), 10);
});
test("invented quotes and assistant-only citations are removed", () => {
  const record = fixture(); record.workflows[0].approvals = fact("Automatic approval", "Approved automatically");
  const result = auditRecord(record, [source]);
  assert.equal(result.record.workflows[0].approvals, null); assert.equal(result.quality.ready, false); assert.equal(result.quality.flags.length, 1);
  assert.equal(grounded(fact("x"), [{ ...source, role: "assistant" }]), false);
});
test("unknown time and contradictions block planning without fabricating zeros", () => {
  const record = fixture(); record.workflows[0].timing = null; record.contradictions = ["Employee gave two different volumes."];
  const audit = auditRecord(record, [source]); assert.equal(audit.quality.ready, false); assert.equal(weeklyHours(audit.record.workflows[0]), null);
  const s = session().session; assert.equal(toInterview({ ...s, status: "submitted", ...audit }), null);
});
test("the graph executes analyst, citation auditor, interviewer with real dependencies", async () => {
  const calls: string[] = [];
  const graph = makeInterviewGraph(async <T extends z.ZodType>(name: string, schema: T, _instructions: string, input: unknown): Promise<z.infer<T>> => {
    calls.push(name); assert.ok(JSON.stringify(input).includes(source.id));
    const record = fixture(); record.workflows[0].approvals = null;
    return schema.parse(name === "workflow_record" ? record : { question: "Who approves an invoice when its amount changes?", focus: "Approval rules" });
  });
  const s = session().session;
  const result = await graph.invoke({ session: s, messages: [source], record: emptyRecord(), quality: s.quality, question: "", focus: "", trace: [] });
  assert.deepEqual(calls, ["workflow_record", "interview_question"]);
  assert.deepEqual(result.trace.map(t => t.node), ["evidence_analyst", "citation_auditor", "interviewer"]);
  assert.match(result.question, /approves/); assert.equal(result.quality.ready, false);
});
test("complete evidence goes directly to employee review, never auto-submits", async () => {
  const graph = makeInterviewGraph(async <T extends z.ZodType>(_name: string, schema: T): Promise<z.infer<T>> => schema.parse(fixture()));
  const s = session().session;
  const result = await graph.invoke({ session: s, messages: [source], record: emptyRecord(), quality: s.quality, question: "", focus: "", trace: [] });
  assert.equal(result.quality.ready, true); assert.match(result.question, /review/i); assert.equal(result.session.status, "invited");
});
test("leases reject concurrent turns and stale checkpoints", () => {
  const { session: s, token } = session(); const lease = storage.claim(s);
  assert.throws(() => storage.claim(s), /Another turn/);
  const next = storage.save({ ...s, status: "active" }, lease, { id: "request-one", fingerprint: "answer-one" });
  assert.equal(next.version, 1); assert.equal(storage.byToken(token).status, "active");
  assert.throws(() => storage.claim(s), /Another turn/);
  assert.equal(storage.replayRequest(next, "request-one", "answer-one"), true);
  assert.throws(() => storage.replayRequest(next, "request-one", "changed-answer"), /different answer/);
  assert.equal(storage.replayRequest(next, "new-request", "new-answer"), false);
});
test("tokens are hashed at rest, expire and rotate atomically", () => {
  const { session: s, token } = session();
  const row = storage.db().prepare("SELECT token_hash FROM sessions WHERE id=?").get(s.id) as { token_hash: string };
  assert.notEqual(row.token_hash, token); assert.equal(row.token_hash, storage.hash(token));
  const replacement = storage.secret(); storage.save(s, storage.claim(s), undefined, replacement);
  assert.throws(() => storage.byToken(token), /invalid or expired/); assert.equal(storage.byToken(replacement).id, s.id);
  storage.db().prepare("UPDATE sessions SET expires=0 WHERE id=?").run(s.id);
  assert.throws(() => storage.byToken(replacement), /invalid or expired/);
});
test("team leads see only their own submitted interviews", () => {
  const a = session().session;
  const b = storage.createSession({ name: "Operations Person", email: "ops@example.test", role: "Dispatcher", team: "Operations" }).session;
  storage.save({ ...a, status: "submitted" }, storage.claim(a)); storage.save({ ...b, status: "submitted" }, storage.claim(b));
  const rows = storage.listSessions({ role: "lead", team: "Finance" });
  assert.ok(rows.some(s => s.id === a.id)); assert.ok(!rows.some(s => s.id === b.id)); assert.ok(rows.every(s => s.status === "submitted" && s.team === "Finance"));
});
test("server snapshots survive reopening the database", async () => {
  const s = session().session;
  const { DatabaseSync } = await import("node:sqlite"); const reopened = new DatabaseSync(process.env.FIELDWORK_DB_PATH!);
  try { assert.equal((reopened.prepare("SELECT id FROM sessions WHERE id=?").get(s.id) as { id: string }).id, s.id); } finally { reopened.close(); }
});
test("retention uses the original consent scope, not newer workspace settings", () => {
  const s = session().session; const old = { ...s, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() };
  storage.save(old, storage.claim(s)); storage.setConfig("settings", { ...scope, retentionDays: 7 }); storage.prune();
  assert.equal(storage.byId(s.id).scope.retentionDays, 90);
  const expired = session().session; storage.save({ ...expired, createdAt: old.createdAt }, storage.claim(expired)); storage.prune();
  assert.throws(() => storage.byId(expired.id), /not found/); storage.setConfig("settings", scope);
});
test("only employee-submitted, complete evidence exports and preserves exact quotes", () => {
  const s = session().session; const audited = auditRecord(fixture(), [source]);
  assert.equal(toInterview({ ...s, ...audited }), null);
  const interview = toInterview({ ...s, ...audited, status: "submitted", messages: [source], consentAt: new Date().toISOString() });
  assert.equal(interview?.tasks[0].hoursPerWeek, 10); assert.equal(interview?.transcript[0].text, source.text);
});
test("model errors are explicit and never disguised as successful interviews", async () => {
  const originalFetch = globalThis.fetch; const originalKey = process.env.OPENAI_API_KEY;
  try {
    process.env.OPENAI_API_KEY = "test-only-not-a-real-key";
    globalThis.fetch = async () => Response.json({ status: "incomplete", output: [] });
    await assert.rejects(generate("record", recordSchema, "test", {}), /could not finish/);
    globalThis.fetch = async () => new Response("provider-internal-secret", { status: 401 });
    await assert.rejects(generate("record", recordSchema, "test", {}), e => e instanceof Error && !e.message.includes("provider-internal-secret"));
  } finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});
