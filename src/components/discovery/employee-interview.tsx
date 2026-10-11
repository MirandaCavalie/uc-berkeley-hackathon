"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Textarea } from "@/components/ui";
import { Wordmark } from "@/components/brand";
import type { ParticipantView } from "@/lib/discovery/schema";
import { WorkflowRecord } from "./workflow-record";

export function EmployeeInterview() {
  const token = useRef("");
  const requestKey = useRef({ fingerprint: "", id: "" });
  const [session, setSession] = useState<ParticipantView | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const response = await fetch("/api/discovery/session", { headers: { Authorization: `Bearer ${token.current}` } });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setSession(data); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "The interview could not be loaded."); }
  }
  useEffect(() => {
    const supplied = new URLSearchParams(window.location.hash.slice(1)).get("access");
    if (supplied) { sessionStorage.setItem("fieldwork-participant", supplied); window.history.replaceState(null, "", "/interview"); }
    token.current = supplied || sessionStorage.getItem("fieldwork-participant") || "";
    if (!token.current) { setError("Open the private interview link in your invitation email."); return; }
    void load();
  }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [session?.messages.length]);

  async function send(action: "consent" | "answer" | "review" | "submit" | "decline") {
    if (!session || busy) return;
    setBusy(true); setError("");
    const body = { action, version: session.version, ...(action === "answer" ? { answer: draft.trim() } : {}), ...(action === "submit" ? { reviewed } : {}) };
    const fingerprint = JSON.stringify(body);
    if (requestKey.current.fingerprint !== fingerprint) requestKey.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/discovery/session", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.current}` }, body: JSON.stringify({ ...body, requestId: requestKey.current.id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setSession(data); if (action === "answer") { setDraft(""); setReviewed(false); }
      requestKey.current = { fingerprint: "", id: "" };
    } catch (e) { setError(e instanceof Error ? e.message : "Your answer could not be sent. It is still in the text box; try again."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:py-12">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3"><Wordmark size={26} /><span className="text-sm text-muted">{session?.settings.company || "Private workflow interview"}</span></header>
    {error && <div role="alert" className="mb-5 rounded-xl bg-bad-soft p-4 text-sm text-bad">{error}<Button className="ml-3" size="sm" onClick={load} disabled={busy}>Refresh</Button></div>}
    {!session && !error && <p role="status">Loading your interview…</p>}
    {session?.status === "invited" && <Card className="space-y-5 p-6 sm:p-8">
      <h1 className="font-display text-3xl">Make the invisible work visible.</h1>
      <p className="leading-7">Hi {session.name}. This conversation explores the repeated work you do, where time goes, and what would make it easier.</p>
      <p className="text-sm leading-6 text-muted">{session.settings.purpose}</p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6"><li>Fieldwork is an AI interviewer. Your answers are processed by OpenAI.</li><li>Participation is voluntary. You can skip questions, pause and return with this link, or decline.</li><li>Drafts are not shown in the research dashboard. After you submit, the research owner and your team lead can read your transcript and record.</li><li>This is workflow research, not a performance assessment. Please use anonymized examples and avoid credentials or sensitive personal information.</li><li>Your record is retained for up to {session.settings.retentionDays} days from invitation. Contact {session.settings.ownerContact} about questions, corrections or withdrawal.</li></ul>
      <p className="text-sm text-muted">About 15–20 minutes · Review your record before submitting · Keep your link private</p>
      {!session.aiConfigured && <p role="status" className="text-sm text-warn">The research owner still needs to configure the AI service before you can answer questions.</p>}
      <div className="flex flex-wrap gap-3"><Button variant="accent" loading={busy} disabled={!session.aiConfigured} onClick={() => send("consent")}>I agree — start interview</Button><Button variant="ghost" disabled={busy} onClick={() => send("decline")}>Decline participation</Button></div>
    </Card>}
    {session && ["active", "review"].includes(session.status) && <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold">Your workflow conversation</h1><p className="text-sm text-muted">{session.role} · {session.team} · Answers saved after each successful turn</p></div><Button size="sm" onClick={() => setShowRecord(!showRecord)}>{showRecord ? "Hide record" : `View record · ${session.quality.coverage}%`}</Button></div>
      {showRecord && <div className="mb-8"><WorkflowRecord record={session.record} quality={session.quality} /></div>}
      <div className="space-y-4" aria-live="polite">{session.messages.map(m => <div key={m.id} className={`max-w-[95%] rounded-2xl px-5 py-4 text-sm leading-7 whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-accent-soft" : "bg-surface shadow-card"}`}><p className="mb-1 text-xs font-semibold text-muted">{m.role === "user" ? "You" : "Fieldwork"}</p>{m.text}</div>)}{busy && <p role="status" className="text-sm text-muted">Checking your answer and updating the work record…</p>}<div ref={bottom} /></div>
      {session.status === "review" && <section className="my-8"><WorkflowRecord record={session.record} quality={session.quality} /><p className="mt-5 text-sm text-muted">Correct anything below by telling the interviewer in the text box. You can submit an incomplete interview; gaps will be visible to the research team.</p><label className="my-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I reviewed the record, including time estimates, and agree to share this transcript and record with the research owner and my team lead.</label><Button variant="accent" onClick={() => send("submit")} loading={busy} disabled={!reviewed || !session.messages.some(m => m.role === "user")}>Submit interview</Button></section>}
      <form className="sticky bottom-3 mt-6 rounded-xl bg-paper p-3 shadow-card" onSubmit={e => { e.preventDefault(); void send("answer"); }}><Textarea aria-label={session.status === "review" ? "Corrections or additions" : "Your answer"} placeholder={session.status === "review" ? "Tell me what to correct or add…" : "Describe it in your own words. “I don’t know” is fine."} value={draft} onChange={e => setDraft(e.target.value)} maxLength={6000} disabled={busy} /><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted">Close this tab to pause. Your link lets you resume.</span><Button type="submit" variant="accent" loading={busy} disabled={!draft.trim()}>Send answer</Button></div></form>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={busy} onClick={() => send("review")}>Finish and review what’s captured</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (window.confirm("Decline participation and discard this interview’s answers?")) void send("decline"); }}>Decline and discard answers</Button></div>
    </>}
    {session?.status === "submitted" && <><Card className="mb-7 p-7"><h1 className="text-2xl font-semibold">Thank you. Your interview is submitted.</h1><p className="mt-3 text-sm leading-6 text-muted">The research owner and your team lead can now review your answers. For corrections or withdrawal, contact {session.settings.ownerContact}.</p></Card><WorkflowRecord record={session.record} quality={session.quality} /></>}
    {session?.status === "declined" && <Card className="p-7"><h1 className="text-xl font-semibold">Participation declined</h1><p className="mt-3 text-sm text-muted">Your interview answers have been discarded.</p></Card>}
  </main>;
}
