import type { Metadata } from "next";
import { ResearchWorkspace } from "@/components/discovery/research-workspace";
export const metadata: Metadata = { title: "Research workspace · Fieldwork", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function ResearchPage() { return <ResearchWorkspace />; }
