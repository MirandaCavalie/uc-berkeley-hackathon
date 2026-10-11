import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { emptyRecord, type Access, type Session, type Settings } from "./schema";

export class DiscoveryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const secret = () => randomBytes(32).toString("base64url");
const host = globalThis as typeof globalThis & { discoveryDb?: DatabaseSync };
export function db() {
  if (host.discoveryDb) return host.discoveryDb;
  const path = resolve(/* turbopackIgnore: true */ process.env.FIELDWORK_DB_PATH || "data/discovery.sqlite");
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(path);
  chmodSync(path, 0o600);
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, expires INTEGER NOT NULL, version INTEGER NOT NULL, data TEXT NOT NULL, lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS access (token_hash TEXT PRIMARY KEY, role TEXT NOT NULL, team TEXT, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS requests (session_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, PRIMARY KEY(session_id, request_id));
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);`);
  host.discoveryDb = database;
  return database;
}
export function config<T>(key: string): T | null {
  const row = db().prepare("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? JSON.parse(row.value) as T : null;
}
export function setConfig(key: string, value: unknown) { db().prepare("INSERT INTO config VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, JSON.stringify(value)); }
export function settings(): Settings {
  const s = config<Settings>("settings");
  if (!s) throw new DiscoveryError("The research owner must set the company and participation scope first.", 409);
  return s;
}
export function prune() {
  db().exec("DELETE FROM sessions WHERE julianday(json_extract(data, '$.createdAt')) + COALESCE(json_extract(data, '$.scope.retentionDays'), 90) < julianday('now')");
  db().exec("DELETE FROM requests WHERE session_id NOT IN (SELECT id FROM sessions)");
  db().prepare("DELETE FROM access WHERE expires < ?").run(Date.now());
  db().prepare("DELETE FROM limits WHERE reset_at < ?").run(Date.now());
}
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  db().prepare(`INSERT INTO limits VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at < ? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at < ? THEN excluded.reset_at ELSE reset_at END`).run(key, now + windowMs, now, now);
  const row = db().prepare("SELECT count FROM limits WHERE key=?").get(key) as { count: number };
  if (row.count > max) throw new DiscoveryError("Too many attempts. Please wait before trying again.", 429);
}
export function createSession(input: Pick<Session, "name" | "email" | "role" | "team">) {
  const person = { ...input, scope: settings() }; prune();
  const token = secret();
  const session: Session = { ...person, id: randomUUID(), status: "invited", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(), consentAt: null, submittedAt: null, version: 0, messages: [], record: emptyRecord(), quality: { missing: ["Interview not started"], flags: [], coverage: 0, ready: false }, trace: [], delivery: { status: "not_sent", at: null } };
  db().prepare("INSERT INTO sessions (id, token_hash, expires, version, data) VALUES (?, ?, ?, ?, ?)").run(session.id, hash(token), Date.parse(session.expiresAt), 0, JSON.stringify(session));
  return { session, token };
}
export function byId(id: string): Session {
  const row = db().prepare("SELECT data FROM sessions WHERE id=?").get(id) as { data: string } | undefined;
  if (!row) throw new DiscoveryError("Interview not found.", 404);
  return JSON.parse(row.data);
}
export function byToken(token: string): Session {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DiscoveryError("This interview link is invalid or expired.", 404);
  prune();
  const row = db().prepare("SELECT data FROM sessions WHERE token_hash=? AND expires > ?").get(hash(token), Date.now()) as { data: string } | undefined;
  if (!row) throw new DiscoveryError("This interview link is invalid or expired.", 404);
  const session = JSON.parse(row.data) as Session;
  if (session.status === "revoked") throw new DiscoveryError("This interview link has been revoked.", 410);
  return session;
}
export function listSessions(access: Access) {
  prune();
  const rows = db().prepare("SELECT data FROM sessions ORDER BY rowid DESC").all() as { data: string }[];
  return rows.map(r => JSON.parse(r.data) as Session).filter(s => access.role === "owner" || (s.team === access.team && s.status === "submitted"));
}
export function claim(session: Session): string {
  const lease = secret();
  const changed = db().prepare("UPDATE sessions SET lease=?, lease_until=? WHERE id=? AND version=? AND lease_until < ?").run(lease, Date.now() + 150000, session.id, session.version, Date.now());
  if (!changed.changes) throw new DiscoveryError("Another turn is running, or this interview changed. Refresh and try again.", 409);
  return lease;
}
export function release(id: string, lease: string) { db().prepare("UPDATE sessions SET lease=NULL, lease_until=0 WHERE id=? AND lease=?").run(id, lease); }
export function replayRequest(session: Session, requestId: string, fingerprint: string) {
  const row = db().prepare("SELECT fingerprint FROM requests WHERE session_id=? AND request_id=?").get(session.id, requestId) as { fingerprint: string } | undefined;
  if (row && row.fingerprint !== fingerprint) throw new DiscoveryError("This request ID was already used for a different answer.", 409);
  return Boolean(row);
}
export function save(session: Session, lease: string, request?: { id: string; fingerprint: string }, replacementToken?: string) {
  const next = { ...session, version: session.version + 1 };
  db().exec("BEGIN IMMEDIATE");
  try {
    const changed = db().prepare("UPDATE sessions SET data=?, version=?, lease=NULL, lease_until=0 WHERE id=? AND version=? AND lease=?").run(JSON.stringify(next), next.version, session.id, session.version, lease);
    if (!changed.changes) throw new DiscoveryError("This interview changed. Reload before continuing.", 409);
    if (replacementToken) db().prepare("UPDATE sessions SET token_hash=?, expires=? WHERE id=?").run(hash(replacementToken), Date.parse(next.expiresAt), next.id);
    if (request) db().prepare("INSERT INTO requests VALUES (?, ?, ?)").run(session.id, request.id, request.fingerprint);
    db().exec("COMMIT"); return next;
  } catch (error) { db().exec("ROLLBACK"); throw error; }
}
export function issueAccess(access: Access, days = 1) {
  const token = secret();
  db().prepare("INSERT INTO access VALUES (?, ?, ?, ?)").run(hash(token), access.role, access.team, Date.now() + days * 86400000);
  return token;
}
export function resolveAccess(token: string): Access | null {
  const row = db().prepare("SELECT role, team FROM access WHERE token_hash=? AND expires > ?").get(hash(token), Date.now()) as Access | undefined;
  return row ?? null;
}
