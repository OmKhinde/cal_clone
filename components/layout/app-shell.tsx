"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/event-types", label: "Event types" },
  { href: "/bookings", label: "Bookings" },
  { href: "/availability", label: "Availability" }
];

const utilityItems = [
  { label: "Teams" },
  { label: "Apps" },
  { label: "Routing" },
  { label: "Workflows" },
  { label: "Insights" }
];

const footerItems = [
  { label: "View public page", href: "/booking/demo/30min" },
  { label: "Copy public page link" },
  { label: "Refer and earn" },
  { label: "Settings" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1920px] flex-col gap-4 px-3 py-2 sm:px-4 lg:flex-row lg:gap-6 lg:px-0">
        <aside className="w-full shrink-0 border-b border-[var(--sidebar-border)] bg-[var(--sidebar)] p-3 lg:sticky lg:top-0 lg:h-screen lg:w-[246px] lg:border-r lg:border-b-0 lg:p-3">
          <Link
            href="/event-types"
            className="flex items-center justify-between rounded-[14px] px-2 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-emerald-300 to-sky-500 text-[11px] font-bold text-black">
                O
              </div>
              <h1 className="text-[14px] font-medium text-white">Om Khinde</h1>
            </div>
            <div className="flex items-center gap-3 text-white/75">
              <span className="text-xs">⌄</span>
              <span className="text-sm">⌕</span>
            </div>
          </Link>

          <nav className="mt-4 grid gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[10px] px-4 py-2.5 text-[15px] font-medium transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10",
                    active
                      ? "bg-[#4b4b4b] text-white"
                      : "text-[#f5f5f5] hover:bg-[#232323]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-2 grid gap-1">
            {utilityItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[10px] px-4 py-2.5 text-[15px] font-medium text-[#f5f5f5] transition-all duration-150 hover:bg-[#232323]"
              >
                {item.label}
              </div>
            ))}
          </div>

          <div className="mt-8 hidden lg:block" />
          <div className="mt-8 grid gap-1 lg:mt-auto">
            {footerItems.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-[10px] px-4 py-2 text-[14px] font-medium text-[#f5f5f5] transition-all duration-150 hover:bg-[#232323]"
                >
                  {item.label}
                </Link>
              ) : (
                <div
                  key={item.label}
                  className="rounded-[10px] px-4 py-2 text-[14px] font-medium text-[#f5f5f5] transition-all duration-150 hover:bg-[#232323]"
                >
                  {item.label}
                </div>
              )
            )}
            <p className="px-4 pt-2 text-[11px] text-[#6f6f6f]">© 2026 Cal.com, Inc. v.6.4.0-rcfdd38</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-3 py-6 text-[var(--foreground)] sm:px-4 lg:px-0 lg:py-6 lg:pr-6">
          {children}
        </main>
      </div>
    </div>
  );
}
