"use client";

import { format, isToday } from "date-fns";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { CalendarIcon, GlobeIcon, LinkIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";

const dashboardStats = [
  { label: "Active event types", href: "/event-types", cta: "Manage event types", icon: LinkIcon },
  { label: "Upcoming bookings", href: "/bookings", cta: "Open bookings", icon: CalendarIcon },
  { label: "Available weekdays", href: "/availability", cta: "Edit schedule", icon: GlobeIcon }
] as const;

export function DashboardPage() {
  const results = useQueries({
    queries: [
      { queryKey: ["event-types"], queryFn: api.listEventTypes },
      { queryKey: ["bookings", "upcoming"], queryFn: () => api.listBookings("upcoming") },
      { queryKey: ["availability"], queryFn: api.getAvailability }
    ]
  });

  const [eventsQuery, bookingsQuery, availabilityQuery] = results;

  if (results.some((query) => query.isLoading)) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-20 w-96" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    );
  }

  const todayBookings = bookingsQuery.data?.data.filter((booking) => isToday(new Date(booking.start))) ?? [];
  const activeEventTypes = eventsQuery.data?.filter((eventType) => eventType.isActive) ?? [];
  const activeDays = availabilityQuery.data?.schedule.filter((row) => row.isActive).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A tight overview of your current event catalog, active weekly hours, and the bookings that need attention first."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {dashboardStats.map((item, index) => {
          const values = [
            String(activeEventTypes.length),
            String(bookingsQuery.data?.meta.total ?? 0),
            String(activeDays)
          ];
          const Icon = item.icon;

          return (
          <Card key={item.label} className="p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-[#b8b8b8]">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">{values[index]}</p>
            <Link href={item.href} className="mt-5 inline-flex text-sm font-medium text-white hover:text-neutral-300">
              {item.cta}
            </Link>
          </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Today</h2>
            <span className="text-sm font-medium text-[#b8b8b8]">{format(new Date(), "PPP")}</span>
          </div>
          <div className="grid gap-3">
            {todayBookings.length ? (
              todayBookings.map((booking) => (
                <div key={booking.uid} className="rounded-[14px] border border-[var(--border)] bg-[var(--panel-muted)] p-4">
                  <p className="text-sm font-semibold text-white">{booking.attendee?.name ?? booking.title}</p>
                  <p className="mt-1 text-sm text-[#b8b8b8]">{booking.eventType.title}</p>
                  <p className="mt-2 text-sm font-medium text-[#ededed]">
                    {format(new Date(booking.start), "p")} - {format(new Date(booking.end), "p")}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-6 text-sm text-[#b8b8b8]">
                Nothing scheduled for today.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Public links</h2>
          <div className="mt-4 grid gap-3">
            {activeEventTypes.slice(0, 4).map((eventType) => (
              <Link
                key={eventType.id}
                href={`/u/${eventType.user?.username ?? "demo"}/${eventType.slug}`}
                className="rounded-[14px] border border-[var(--border)] bg-[var(--panel-muted)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[#181818]"
              >
                <p className="text-sm font-semibold text-white">{eventType.title}</p>
                <p className="mt-1 text-sm text-[#b8b8b8]">
                  /u/{eventType.user?.username ?? "demo"}/{eventType.slug}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
