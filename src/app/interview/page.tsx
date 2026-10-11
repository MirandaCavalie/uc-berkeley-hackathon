import type { Metadata } from "next";
import { EmployeeInterview } from "@/components/discovery/employee-interview";
export const metadata: Metadata = { title: "Your workflow interview · Fieldwork", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function InterviewPage() { return <EmployeeInterview />; }
