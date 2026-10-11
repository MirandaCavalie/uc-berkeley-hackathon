import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

async function main() {
  const directory = mkdtempSync(join(tmpdir(), "fieldwork-http-test-"));
  const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, "127.0.0.1", resolve));
  const address = probe.address(); if (!address || typeof address === "string") throw new Error("No test port");
  const port = address.port; await new Promise<void>(resolve => probe.close(() => resolve()));
  const origin = `http://localhost:${port}`;
  const preview = process.argv.includes("--preview");
  const password = preview ? "Fieldwork-synthetic-ui-test-only" : randomBytes(24).toString("base64url");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port)], {
    env: { ...process.env, NODE_ENV: "production", FIELDWORK_DB_PATH: join(directory, "research.sqlite"), FIELDWORK_ADMIN_PASSWORD: password, OPENAI_API_KEY: "", SMTP_PASSWORD: "", FIELDWORK_PUBLIC_URL: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = ""; server.stdout.on("data", b => { logs = (logs + String(b)).slice(-2000); }); server.stderr.on("data", b => { logs = (logs + String(b)).slice(-2000); });
  let count = 0;
  const check = (condition: unknown, message: string) => { assert.ok(condition, message); count++; };
  async function request(path: string, body?: unknown, cookie = "", token = "", requestOrigin = origin) {
    const response = await fetch(`${origin}/api/${path}`, { method: body ? "POST" : "GET", headers: { ...(body ? { "Content-Type": "application/json", Origin: requestOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { response, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] || "" };
  }
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) { if (server.exitCode !== null) throw new Error(`Test server exited: ${logs}`); try { const response = await fetch(`${origin}/api/discovery/auth`); if (response.ok) { ready = true; break; } } catch {} await delay(250); }
    check(ready, "Production server starts");
    check((await request("discovery/manage")).response.status === 401, "Anonymous users cannot read interviews");
    check((await request("discovery/auth", { action: "setup", password })).response.status === 403, "Public first-owner registration disabled in production");
    check((await request("discovery/auth", { action: "login", password }, "", "", "https://attacker.example")).response.status === 403, "Cross-origin login rejected");
    const login = await request("discovery/auth", { action: "login", password }); const owner = login.cookie;
    check(login.response.ok && owner, "Owner signs in with an HTTP-only session");
    check((login.response.headers.get("set-cookie") || "").includes("HttpOnly"), "Owner session cookie is HTTP-only");
    const settings = { company: "HTTP Test Company", purpose: "Discover repeated work using anonymized examples.", ownerContact: "research@example.test", retentionDays: 90 };
    check((await request("discovery/manage", { action: "settings", settings }, owner)).response.ok, "Owner saves research scope");
    const created = await request("discovery/manage", { action: "invite", person: { name: "Synthetic Employee", email: "employee@example.test", role: "AP Specialist", team: "Finance" } }, owner);
    check(created.response.ok && created.data.link.includes("#access="), "Employee invitation uses a fragment token");
    check((await request("discovery/manage", { action: "settings", settings: { ...settings, company: "Other Company" } }, owner)).response.status === 409, "Existing interviews cannot be mixed into another company");
    const token = created.data.token; let session = created.data.session;
    check((await request("discovery/session", undefined, "", "wrong")).response.status === 404, "Invalid employee token rejected");
    const input = (action: string, extra = {}) => ({ action, version: session.version, requestId: randomUUID(), ...extra });
    check((await request("discovery/session", input("answer", { answer: "A private answer" }), "", token)).response.status === 403, "Consent is enforced on the server");
    const consent = input("consent"); const accepted = await request("discovery/session", consent, "", token); session = accepted.data;
    check(accepted.response.ok && session.status === "active", "Employee accepts scope and starts interview");
    const repeated = await request("discovery/session", consent, "", token);
    check(repeated.response.ok && repeated.data.messages.length === 1, "Retried consent does not duplicate messages");
    const before = session.version;
    check((await request("discovery/session", input("answer", { answer: "I match invoices manually." }), "", token)).response.status === 503, "Missing model returns explicit unavailable status");
    session = (await request("discovery/session", undefined, "", token)).data;
    check(session.version === before && session.messages.length === 1, "Failed model call does not consume an answer or change state");
    const ownerView = await request("discovery/manage", undefined, owner);
    check(ownerView.data.sessions[0].messages.length === 0 && ownerView.data.sessions[0].record === null, "Unsubmitted content is hidden from research dashboard");
    const leadLink = await request("discovery/manage", { action: "lead", team: "Finance" }, owner);
    const leadToken = new URL(leadLink.data.link).hash.slice("#access=".length);
    const leadLogin = await request("discovery/auth", { action: "lead", token: leadToken }); const lead = leadLogin.cookie;
    check((await request("discovery/manage", undefined, lead)).data.sessions.length === 0, "Lead cannot read unsubmitted interview");
    check((await request("discovery/manage", { action: "settings", settings }, lead)).response.status === 403, "Lead cannot change owner settings");
    check((await request("discovery/manage", { action: "send", id: session.id, token }, owner)).response.status === 503, "Mail is blocked without SMTP/public URL");
    check((await request("helpers/meeting", {})).response.status === 401, "Existing paid helper API is protected in production");
    const rotated = await request("discovery/manage", { action: "link", id: session.id }, owner);
    check(rotated.response.ok && (await request("discovery/session", undefined, "", token)).response.status === 404, "Rotating invitation invalidates old link");
    const newToken = rotated.data.token; session = (await request("discovery/session", undefined, "", newToken)).data;
    check(session.status === "active", "New link resumes existing interview");
    const declined = await request("discovery/session", input("decline"), "", newToken);
    check(declined.response.ok && declined.data.messages.length === 0 && declined.data.record.workflows.length === 0, "Declining discards answers");
    check((await request("discovery/manage", { action: "revoke_lead", team: "Finance" }, owner)).response.ok, "Owner can revoke all team access");
    check((await request("discovery/manage", undefined, lead)).response.status === 401, "Team session stops working after revocation");
    console.log(`check-discovery-http: ${count} production HTTP assertions passed; no model requests or emails sent.`);
    if (preview) {
      const example = await request("discovery/manage", { action: "invite", person: { name: "Alex Example", email: "alex@example.test", role: "Operations coordinator", team: "Operations" } }, owner);
      console.log(`Synthetic UI preview: ${origin}/research\nTest-only owner password: ${password}\nEmployee preview: ${example.data.link}`);
      await new Promise<void>(resolve => { process.once("SIGINT", resolve); process.once("SIGTERM", resolve); });
    }
  } finally {
    server.kill("SIGTERM"); await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once("exit", () => resolve()); });
    rmSync(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "HTTP check failed"); process.exitCode = 1; });
