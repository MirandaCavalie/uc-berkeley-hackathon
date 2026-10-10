"use client";

import clsx from "clsx";
import { Layers, MessagesSquare, Radar, RotateCcw, Rocket, Route, Sparkles, SwatchBook, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { useStore } from "@/lib/store";

const nav = [
  {
    section: null,
    items: [
      { href: "/", label: "Overview", icon: Layers },
      { href: "/review", label: "Review Loop", icon: MessagesSquare },
      { href: "/interviews", label: "Interviews", icon: Users },
      { href: "/brand", label: "Brand Kit", icon: SwatchBook },
    ],
  },
  {
    section: "Labs",
    items: [
      { href: "/radar", label: "Radar", icon: Radar },
      { href: "/learn", label: "Learning", icon: Route },
      { href: "/launch", label: "Campaign Launch", icon: Rocket },
      { href: "/studio", label: "Creative Studio", icon: Sparkles },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const workspace = useStore((s) => s.workspace);
  const resetDemo = useStore((s) => s.resetDemo);
  const [engine, setEngine] = useState<{ llm: boolean; label: string; jev?: boolean } | null>(null);

  useEffect(() => {
    useStore.persist.rehydrate();
    fetch("/api/status")
      .then((r) => r.json())
      .then(setEngine)
      .catch(() => setEngine({ llm: false, label: "Local engine" }));
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-paper px-3 py-4 md:flex">
        <Link href="/" className="pressable mb-6 flex items-center gap-2.5 rounded-lg px-2 py-1">
          <Logo />
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight">CreativeOps Radar</div>
            
          </div>
        </Link>

        <nav className="flex-1 space-y-5 overflow-y-auto scrollbar-thin">
          {nav.map((group, gi) => (
            <div key={gi}>
              {group.section && <div className="mb-1 px-2 text-[11px] font-medium tracking-wide text-faint uppercase">{group.section}</div>}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={clsx(
                          "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] transition-colors duration-150",
                          active ? "bg-surface font-medium text-ink shadow-card" : "text-ink-2 hover:bg-sunken",
                        )}
                      >
                        <Icon className={clsx("size-4", active ? "text-accent" : "text-muted")} strokeWidth={1.8} />
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-line pt-3">
          <div className="rounded-lg bg-surface p-2.5 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-[12.5px] font-medium">{workspace.company}</div>
              {workspace.synthetic && (
                <span className="shrink-0 rounded bg-warn-soft px-1 py-px text-[10.5px] font-medium text-warn">Synthetic</span>
              )}
            </div>
            <div className="truncate text-[11.5px] text-muted">{workspace.teamSize || workspace.industry || "Workspace"}</div>
          </div>
          <div className="flex items-center justify-between px-1">
            <div
              className="flex items-center gap-1.5 text-[11.5px] text-muted"
              title={engine ? `${engine.label}${engine.jev ? " · classification and scoring decided by Jev" : ""}` : undefined}
            >
              <span className={clsx("size-1.5 rounded-full", engine?.llm || engine?.jev ? "bg-good" : engine ? "bg-assist" : "bg-faint")} />
              <span className="max-w-[160px] truncate">{engine ? `${engine.label}${engine.jev ? " + Jev" : ""}` : "Checking engine…"}</span>
            </div>
            <button
              type="button"
              title="Reset demo workspace"
              onClick={() => {
                resetDemo();
                toast("Demo workspace restored", { description: "Seed evidence, brand kit, and drafts are back." });
              }}
              className="pressable grid size-6 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <MobileNav pathname={pathname} />
        <main className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-12">{children}</main>
      </div>
      <Toaster position="bottom-right" toastOptions={{ className: "!rounded-xl !text-[13px]" }} />
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const items = nav.flatMap((g) => g.items);
  return (
    <div className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-line bg-paper/90 px-3 py-2 backdrop-blur md:hidden">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("shrink-0 rounded-md px-2.5 py-1 text-[13px]", active ? "bg-surface font-medium shadow-card" : "text-ink-2")}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-ink" style={{ width: size, height: size }}>
      <svg viewBox="0 0 28 28" width={size} height={size}>
        <circle cx="14" cy="14" r="9" fill="none" stroke="rgb(255 255 255 / 0.18)" />
        <circle cx="14" cy="14" r="5" fill="none" stroke="rgb(255 255 255 / 0.28)" />
        <g className="radar-sweep">
          <path d="M14 14 L14 4 A10 10 0 0 1 22.5 9 Z" fill="url(#sweep)" />
        </g>
        <circle cx="19" cy="10" r="1.6" fill="#f472b6" />
        <circle cx="10" cy="17" r="1.3" fill="#818cf8" />
        <defs>
          <linearGradient id="sweep" x1="14" y1="4" x2="22" y2="10">
            <stop offset="0" stopColor="rgb(255 255 255 / 0.5)" />
            <stop offset="1" stopColor="rgb(255 255 255 / 0)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}