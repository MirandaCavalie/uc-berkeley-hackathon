import { Suspense } from "react";
import { PersonalWorkspace } from "@/components/personal/personal-workspace";

export const metadata = { title: "My work · Fieldwork" };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

async function Workspace({ searchParams }: { searchParams: Search }) {
  const query = await searchParams;
  return <PersonalWorkspace initialEmployee={first(query.employee)} calendarResult={first(query.calendar)} />;
}

export default function MyWorkPage({ searchParams }: { searchParams: Search }) {
  return <Suspense fallback={<p className="text-muted">Loading your workspace…</p>}><Workspace searchParams={searchParams} /></Suspense>;
}
