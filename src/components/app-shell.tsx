"use client";

import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { useStore } from "@/lib/store";
import { Wordmark } from "./brand";

const nav = [
  { href: "/discovery", step: 1, label: "Discovery", sub: "Interview the team" },
  { href: "/opportunities", step: 2, label: "Opportunities", sub: "Decide where AI fits" },
  { href: "/roadmap", step: 3, label: "Roadmap", sub: "What to build, in order" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const workspace = useStore((s) => s.workspace);
  const resetDemo = useStore((s) => s.resetDemo);
  const [jev, setJev] = useState<boolean | null>(null);

  useEffect(() => {
    useStore.persist.rehydrate();
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setJev(Boolean(s.jev)))
      .catch(() => setJev(false));
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-paper px-3 py-4 md:flex">
        <Link href="/" className="pressable mb-7 flex items-center rounded-lg px-2 py-1">
          <Wordmark size={26} />
        </Link>

        <div className="mb-2 px-2 text-[11px] font-medium tracking-wide text-faint uppercase">Engagement</div>
        <nav className="flex-1">
          <ol className="space-y-0.5">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-150",
                      active ? "bg-surface shadow-card" : "hover:bg-sunken",
                    )}
                  >
                    <span
                      className={clsx(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold tabular-nums",
                        active ? "bg-accent text-white" : "bg-sunken text-muted",
                      )}
                    >
                      {item.step}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className={clsx("block text-[13.5px]", active ? "font-medium text-ink" : "text-ink-2")}>{item.label}</span>
                      <span className="block truncate text-[11.5px] text-faint">{item.sub}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="space-y-2 border-t border-line pt-3">
          <div className="rounded-lg bg-surface p-2.5 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-[12.5px] font-medium">{workspace.company}</div>
              {workspace.synthetic && <span className="shrink-0 rounded bg-warn-soft px-1 py-px text-[10.5px] font-medium text-warn">Demo</span>}
            </div>
            <div className="truncate text-[11.5px] text-muted">{[workspace.industry, workspace.employees].filter(Boolean).join(" · ") || "Client workspace"}</div>
          </div>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted" title="Jev decides process, solution type, and readiness scores">
              <span className={clsx("size-1.5 rounded-full", jev ? "bg-good" : jev === false ? "bg-signal" : "bg-faint")} />
              {jev == null ? "Checking Jev…" : jev ? "Jev connected" : "Jev off · rules only"}
            </div>
            <button
              type="button"
              title="Reset demo workspace"
              onClick={() => {
                resetDemo();
                toast("Demo workspace restored", { description: "Northwind Freight's interviews are back." });
              }}
              className="pressable grid size-6 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-1 overflow-x-auto border-b border-line bg-paper/90 px-3 py-2 backdrop-blur md:hidden">
          <Link href="/" className="mr-2 shrink-0">
            <Wordmark size={22} />
          </Link>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx("shrink-0 rounded-md px-2.5 py-1 text-[13px]", pathname.startsWith(item.href) ? "bg-surface font-medium shadow-card" : "text-ink-2")}
            >
              {item.step}. {item.label}
            </Link>
          ))}
        </div>
        <main className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-12">{children}</main>
      </div>
      <Toaster position="bottom-right" toastOptions={{ className: "!rounded-xl !text-[13px]" }} />
    </div>
  );
}

export function NextStep({ href, label }: { href: string; label: ReactNode }) {
  return (
    <Link
      href={href}
      className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13.5px] font-medium text-white shadow-[0_1px_2px_rgb(109_69_217/0.35)] hover:bg-accent-2"
    >
      {label}
    </Link>
  );
}
