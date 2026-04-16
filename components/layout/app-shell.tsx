"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AppsIcon,
  BoltIcon,
  CalendarIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  GridIcon,
  InsightsIcon,
  LinkIcon,
  RoutingIcon,
  SearchIcon,
  UsersIcon
} from "@/components/ui/icons";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/event-types", label: "Event types", icon: LinkIcon },
  { href: "/bookings", label: "Bookings", icon: CalendarIcon },
  { href: "/availability", label: "Availability", icon: GlobeIcon }
];

const utilityItems = [
  { label: "Teams", icon: UsersIcon },
  { label: "Apps", icon: AppsIcon, expandable: true },
  { label: "Routing", icon: RoutingIcon },
  { label: "Workflows", icon: BoltIcon },
  { label: "Insights", icon: InsightsIcon, expandable: true }
];

const footerItems = [
  { label: "Refer and earn", icon: UsersIcon },
  { label: "Settings", icon: GridIcon }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: eventTypes } = useQuery({
    queryKey: ["event-types"],
    queryFn: api.listEventTypes
  });
  const publicUsername = eventTypes?.find((eventType) => eventType.user?.username)?.user?.username ?? "demo";
  const publicPageHref = `/u/${publicUsername}`;

  return (
    <div className="app-shell-grid bg-[var(--background)]">
      <aside className="border-b border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col px-3 pb-3 pt-4">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-[12px] px-2 py-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-[#1f2937]">
                <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,#f4c98b,transparent_32%),radial-gradient(circle_at_72%_74%,#1cc27d,transparent_27%),linear-gradient(135deg,#2d5bff,#111827)]" />
              </div>
              <h1 className="text-[14px] font-medium text-white">Om Khinde</h1>
            </div>
            <div className="flex items-center gap-3 text-[#a1a1aa]">
              <ChevronDownIcon className="h-4 w-4" />
              <SearchIcon className="h-4 w-4" />
            </div>
          </Link>

          <nav className="mt-5 grid gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-all duration-150",
                    active
                      ? "bg-[#3a3a3d] text-white"
                      : "text-[#f5f5f5] hover:bg-[#1c1d21]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#d4d4d8]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 grid gap-1">
            {utilityItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[14px] font-medium text-[#f5f5f5] transition-all duration-150 hover:bg-[#1c1d21]"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0 text-[#d4d4d8]" />
                  <span>{item.label}</span>
                </div>
                {item.expandable ? <ChevronDownIcon className="h-4 w-4 text-[#71717a]" /> : null}
              </div>
            ))}
          </div>

          <div className="mt-8 hidden lg:block lg:flex-1" />

          <div className="mt-8 grid gap-1 lg:mt-auto">
            <Link
              href={publicPageHref}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium text-[#f5f5f5] transition-all duration-150 hover:bg-[#1c1d21]"
            >
              <ExternalLinkIcon className="h-4 w-4 text-[#d4d4d8]" />
              View public page
            </Link>
            <button
              type="button"
              className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[14px] font-medium text-[#f5f5f5] transition-all duration-150 hover:bg-[#1c1d21]"
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}${publicPageHref}`);
              }}
            >
              <CopyIcon className="h-4 w-4 text-[#d4d4d8]" />
              Copy public page link
            </button>
            {footerItems.map((item) =>
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium text-[#f5f5f5] transition-all duration-150 hover:bg-[#1c1d21]"
              >
                <item.icon className="h-4 w-4 text-[#d4d4d8]" />
                {item.label}
              </div>
            )}
            <p className="px-3 pt-2 text-[10px] text-[#5f6066]">© 2026 Cal.com, Inc. v.6.4.1-h-aac9be5</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-5 text-[var(--foreground)] sm:px-6 lg:px-9 lg:py-6">
        <div className="mx-auto max-w-[1680px]">
          {children}
        </div>
      </main>
    </div>
  );
}
