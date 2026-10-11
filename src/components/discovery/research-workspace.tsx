"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { Wordmark } from "@/components/brand";
import { useStore } from "@/lib/store";
import type { Access, Session, Settings } from "@/lib/discovery/schema";
import type { Interview } from "@/lib/types";
import { WorkflowRecord } from "./workflow-record";

type Summary = Omit<Session, "record" | "quality"> & { record: Session["record"] | null; quality: Session["quality"] | null };
type Dashboard = { access: Access; settings: Settings | null; sessions: Summary[]; aiConfigured: boolean; mailConfigured: boolean; publicUrl: string | null };
type Invite = { session: Session; link: string; token: string; preview: string };
async function api(path: string, body?: unknown) {
  const response = await fetch(`/api/discovery/${path}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await response.json(); if (!response.ok) throw new Error(data.error || data.message || "Request failed."); return data;
}
export function ResearchWorkspace() {
  const [auth, setAuth] = useState<{ access: Access | null; configured: boolean; canSetup: boolean } | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<Settings>({ company: "", purpose: "Learn how repeated work happens, where time is lost, and what should stay under human control.", ownerContact: "", retentionDays: 90 });
  const [person, setPerson] = useState({ name: "", email: "", role: "", team: "" });
  const [invitation, setInvitation] = useState<Invite | null>(null);
  const [leadTeam, setLeadTeam] = useState("");
  const [leadLink, setLeadLink] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  async function refresh() {
    const who = await api("auth"); setAuth(who);
    if (who.access) { const data = await api("manage"); setDashboard(data); if (data.settings) setScope(data.settings); }
    else setDashboard(null);
  }
  useEffect(() => {
    useStore.persist.rehydrate();
    const token = new URLSearchParams(window.location.hash.slice(1)).get("access");
    if (token) window.history.replaceState(null, "", "/research");
    void (async () => { try { if (token) await api("auth", { action: "lead", token }); await refresh(); } catch (e) { setError(String((e as Error).message)); } })();
  }, []);

  async function perform(job: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await job(); } catch (e) { setError(e instanceof Error ? e.message : "The action failed."); }
    finally { setBusy(false); }
  }
  async function copy(text: string) { await navigator.clipboard.writeText(text); setNotice("Copied. Share this private link only with its intended recipient."); }
  async function importRecords() {
    const { interviews } = await api("manage", { action: "export" }) as { interviews: Interview[] };
    if (!interviews.length) throw new Error("No submitted records have complete evidence and usable time estimates yet.");
    const state = useStore.getState();
    if (!dashboard?.settings) return;
    if (!state.workspace.synthetic && state.workspace.company !== dashboard.settings.company) throw new Error("This browser’s work map belongs to another company. Export the research records instead of mixing companies.");
    if (!window.confirm(`Add ${interviews.length} evidence-ready interviews to this browser’s work map? Demo interviews will be replaced. These records will also be saved in this browser.`)) return;
    const ids = new Set(interviews.map(i => i.id));
    useStore.setState({ workspace: { ...state.workspace, company: dashboard.settings.company, synthetic: false, ...(state.workspace.synthetic ? { employees: "", industry: "", teamRoster: [] } : {}) }, interviews: [...(state.workspace.synthetic ? [] : state.interviews.filter(i => !ids.has(i.id))), ...interviews], analysis: null, ...(state.workspace.synthetic ? { overrides: {}, personalHelpers: [], helperDrafts: {}, connectedApps: {} } : {}) });
    setNotice(`${interviews.length} interviews added. Open Discovery or Opportunities to work with them.`);
  }
  const owner = dashboard?.access.role === "owner";
  const record = dashboard?.sessions.find(s => s.id === selected);
  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <header className="mb-10 flex flex-wrap items-center justify-between gap-4"><Link href="/discovery"><Wordmark size={26} /></Link><div className="flex items-center gap-3"><Link href="/discovery" className="text-sm text-muted">Work map</Link>{auth?.access && <Button size="sm" disabled={busy} onClick={() => perform(async () => { await api("auth", { action: "logout" }); setInvitation(null); setLeadLink(""); await refresh(); })}>Sign out</Button>}</div></header>
    <div className="mb-7"><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">Employee research</p><h1 className="font-display text-3xl sm:text-4xl">Discover how work really happens.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Independent conversations, concrete examples, and workflow records grounded in employee answers.</p></div>
    {error && <div role="alert" className="mb-5 rounded-xl bg-bad-soft p-4 text-sm text-bad">{error}</div>}
    {notice && <div role="status" className="mb-5 rounded-xl bg-good-soft p-4 text-sm text-good">{notice}</div>}
    {!auth && !error && <p>Loading research workspace…</p>}
    {auth && !auth.access && <Card className="max-w-lg p-6"><h2 className="text-lg font-semibold">{auth.canSetup ? "Set up the research owner" : "Research owner sign in"}</h2><p className="mt-2 mb-5 text-sm text-muted">{auth.canSetup ? "Choose a password of at least 12 characters. It protects employee records in this installation." : "Team leads should use the private access link supplied by the research owner."}</p>{!auth.configured && !auth.canSetup ? <p className="text-sm">The server owner must configure FIELDWORK_ADMIN_PASSWORD or initialize the owner on the local development server.</p> : <form className="space-y-4" onSubmit={e => { e.preventDefault(); void perform(async () => { await api("auth", { action: auth.canSetup ? "setup" : "login", password }); setPassword(""); await refresh(); }); }}><Field label="Owner password"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={auth.canSetup ? 12 : 1} maxLength={200} autoComplete={auth.canSetup ? "new-password" : "current-password"} required /></Field><Button type="submit" variant="accent" loading={busy}>{auth.canSetup ? "Create owner account" : "Sign in"}</Button></form>}</Card>}
    {dashboard && <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Badge tone="accent">{owner ? "Research owner · all teams" : `Team lead · ${dashboard.access.team}`}</Badge><Button size="sm" loading={busy} onClick={() => perform(refresh)}>Refresh interviews</Button></div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">{[["Invited", dashboard.sessions.filter(s => s.status === "invited").length], ["In conversation", dashboard.sessions.filter(s => ["active", "review"].includes(s.status)).length], ["Submitted", dashboard.sessions.filter(s => s.status === "submitted").length]].map(([label, value]) => <Card className="p-5" key={label}><p className="text-sm text-muted">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p></Card>)}</div>
      {owner && <>
        <Card className="mb-6 p-5"><h2 className="mb-3 font-semibold">Connection readiness</h2><div className="flex flex-wrap gap-2"><Badge tone={dashboard.aiConfigured ? "good" : "warn"}>AI: {dashboard.aiConfigured ? "key configured · live verification required" : "key needed"}</Badge><Badge tone={dashboard.mailConfigured ? "good" : "warn"}>SMTP: {dashboard.mailConfigured ? "configured · delivery test required" : "setup needed"}</Badge><Badge tone={dashboard.publicUrl ? "good" : "warn"}>{dashboard.publicUrl || "Public HTTPS address needed for email"}</Badge></div><details className="mt-4 text-sm text-muted"><summary className="cursor-pointer">Connect Gmail and the AI interviewer</summary><p className="mt-3 leading-6">Add a private replacement OPENAI_API_KEY to the server environment. For Gmail, use SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, your Gmail address as SMTP_USER and SMTP_FROM, and a Google app password as SMTP_PASSWORD. Set FIELDWORK_PUBLIC_URL to the hosted HTTPS address employees can reach. Keep credentials out of interview answers. Restart the server after configuration changes.</p><p className="mt-2">The default database is a private SQLite file. Hosting must provide persistent disk; see SOP.md for deployment and backup requirements.</p></details></Card>
        <details open={!dashboard.settings} className="mb-6 rounded-xl bg-surface p-5 shadow-card"><summary className="cursor-pointer font-semibold">Company and participation scope</summary><form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void perform(async () => { await api("manage", { action: "settings", settings: scope }); await refresh(); setNotice("Scope saved. Existing invitations keep the scope employees originally received."); }); }}><Field label="Company"><Input required value={scope.company} onChange={e => setScope({ ...scope, company: e.target.value })} maxLength={160} /></Field><Field label="Research owner contact email"><Input type="email" required value={scope.ownerContact} onChange={e => setScope({ ...scope, ownerContact: e.target.value })} /></Field><div className="sm:col-span-2"><Field label="Purpose shown to employees"><Textarea required minLength={10} maxLength={1500} value={scope.purpose} onChange={e => setScope({ ...scope, purpose: e.target.value })} /></Field></div><Field label="Retention in days from invitation"><Input type="number" min={7} max={365} required value={scope.retentionDays} onChange={e => setScope({ ...scope, retentionDays: Number(e.target.value) })} /></Field><div className="self-end"><Button type="submit" variant="accent" loading={busy}>Save scope</Button></div></form></details>
        {dashboard.settings && <Card className="mb-6 p-5"><h2 className="text-lg font-semibold">Invite an employee</h2><p className="mt-1 text-sm text-muted">Create a private link, review the invitation, then send it through your configured mail account.</p><form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); void perform(async () => { setInvitation(await api("manage", { action: "invite", person })); setPerson({ name: "", email: "", role: "", team: "" }); await refresh(); }); }}>{(["name", "email", "role", "team"] as const).map(key => <Field key={key} label={{ name: "Employee name", email: "Email", role: "Role", team: "Team" }[key]}><Input required type={key === "email" ? "email" : "text"} value={person[key]} onChange={e => setPerson({ ...person, [key]: e.target.value })} maxLength={key === "team" ? 100 : 160} /></Field>)}<Button type="submit" variant="accent" loading={busy}>Create invitation</Button></form></Card>}
        {invitation && <Card className="mb-6 p-5"><h2 className="font-semibold">Review invitation to {invitation.session.email}</h2><pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-paper p-4 font-sans text-sm leading-6 whitespace-pre-wrap break-words">{invitation.preview}</pre><div className="mt-4 flex flex-wrap gap-2"><Button loading={busy} onClick={() => perform(() => copy(invitation.link))}>Copy private link</Button><a href={invitation.link} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center px-3 text-sm text-accent">Open employee view</a><Button variant="accent" loading={busy} disabled={!dashboard.aiConfigured || !dashboard.mailConfigured || !dashboard.publicUrl} onClick={() => perform(async () => { const result = await api("manage", { action: "send", id: invitation.session.id, token: invitation.token }); setNotice(result.message); setInvitation(null); await refresh(); })}>Send invitation email</Button></div></Card>}
      </>}
      <Card className="mb-6 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5"><h2 className="font-semibold">{owner ? "Employee interviews" : "Your team’s submitted interviews"}</h2><Button size="sm" disabled={busy} onClick={() => perform(importRecords)}>Use evidence-ready records in work map</Button></div>{!dashboard.sessions.length && <p className="p-6 text-sm text-muted">{owner ? "No invitations yet. Start with a few employees who do the work every week." : "Submitted interviews from your team will appear here."}</p>}<div className="divide-y divide-line">{dashboard.sessions.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium">{s.name}</p><p className="text-xs text-muted">{s.role} · {s.team}</p></div><div className="flex flex-wrap items-center gap-2"><Badge tone={s.status === "submitted" ? "good" : "neutral"}>{s.status}</Badge>{owner && <span className="text-xs text-muted">Mail: {s.delivery.status}</span>}{s.status === "submitted" && <Button size="sm" onClick={() => setSelected(selected === s.id ? null : s.id)}>View evidence</Button>}{owner && !["submitted", "revoked", "declined"].includes(s.status) && <Button size="sm" disabled={busy} onClick={() => perform(async () => { if (!window.confirm("Create a replacement private link? The previous link will stop working.")) return; setInvitation(await api("manage", { action: "link", id: s.id })); await refresh(); })}>Replace link</Button>}{owner && !["revoked", "declined"].includes(s.status) && <Button size="sm" variant="danger" disabled={busy} onClick={() => perform(async () => { if (!window.confirm("Revoke this interview? The employee link will stop working and the record will leave team-lead views.")) return; await api("manage", { action: "revoke", id: s.id }); await refresh(); })}>Revoke</Button>}</div></div>)}</div></Card>
      {record?.record && record.quality && <section className="mb-8"><h2 className="mb-4 text-xl font-semibold">{record.name} · submitted evidence</h2><WorkflowRecord record={record.record} quality={record.quality} /><details className="mt-4 rounded-xl bg-surface p-5 shadow-card"><summary className="cursor-pointer font-medium">Full interview transcript</summary>{record.messages.map(m => <p key={m.id} className="mt-4 text-sm leading-6 whitespace-pre-wrap"><strong>{m.role === "user" ? record.name : "Fieldwork"}:</strong> {m.text}</p>)}</details><Button className="mt-4" onClick={() => { const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `fieldwork-${record.id}.json`; a.click(); URL.revokeObjectURL(url); }}>Download evidence record</Button></section>}
      {owner && <Card className="p-5"><h2 className="font-semibold">Team lead access</h2><p className="mt-1 text-sm text-muted">A lead can read submitted records for this exact team name. Access links expire after seven days; signed-in sessions last one day.</p><div className="mt-4 flex flex-wrap gap-3"><Input aria-label="Team for lead access" placeholder="Exact team name" value={leadTeam} onChange={e => setLeadTeam(e.target.value)} className="max-w-xs" maxLength={100} /><Button loading={busy} disabled={!leadTeam.trim()} onClick={() => perform(async () => { const result = await api("manage", { action: "lead", team: leadTeam.trim() }); setLeadLink(result.link); })}>Create team access link</Button>{leadLink && <Button onClick={() => perform(() => copy(leadLink))}>Copy team access link</Button>}</div></Card>}
      {owner && <div className="mt-3"><Button variant="danger" size="sm" disabled={busy || !leadTeam.trim()} onClick={() => perform(async () => { if (!window.confirm(`Revoke all access links and signed-in sessions for ${leadTeam.trim()} team leads?`)) return; await api("manage", { action: "revoke_lead", team: leadTeam.trim() }); setLeadLink(""); setNotice("Team access revoked, including existing signed-in sessions."); })}>Revoke access for the selected team</Button></div>}
    </>}
  </main>;
}
