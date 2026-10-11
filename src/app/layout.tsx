import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3477";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Fieldwork: find where AI actually helps",
  description:
    "Fieldwork interviews every employee, maps how work really gets done, and turns it into an AI roadmap: what becomes an automation, an AI skill, or an agent, and what stays human.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
