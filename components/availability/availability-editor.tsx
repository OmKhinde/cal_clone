"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import type { AvailabilityRow, DayOfWeek } from "@/lib/api/types";

const weekOrder: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const timezoneOptions = ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"];

function labelFor(day: DayOfWeek) {
  return day.slice(0, 1) + day.slice(1).toLowerCase();
}

function buildDefaultSchedule(rows: AvailabilityRow[]) {
  return weekOrder.map((dayOfWeek) => rows.find((row) => row.dayOfWeek === dayOfWeek) ?? { dayOfWeek, startTime: "09:00", endTime: "17:00", isActive: false });
}

export function AvailabilityEditor() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["availability"],
    queryFn: api.getAvailability
  });

  const initial = useMemo(() => {
    return {
      timezone: data?.timezone ?? "UTC",
      schedule: buildDefaultSchedule(data?.schedule ?? [])
    };
  }, [data]);

  const [draft, setDraft] = useState(initial);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const mutation = useMutation({
    mutationFn: () => api.replaceAvailability(draft),
    onSuccess: async (result) => {
      setDraft({
        timezone: result.timezone,
        schedule: buildDefaultSchedule(result.schedule)
      });
      await queryClient.invalidateQueries({ queryKey: ["availability"] });
    }
  });

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-14 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Availability"
        title="Availability"
        description="Configure times when you are available for bookings."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex rounded-[12px] bg-[var(--panel-soft)] p-1">
              <button className="rounded-[10px] border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm text-white">My availability</button>
              <button className="rounded-[10px] px-3 py-1.5 text-sm text-[#c8c8c8]">Team availability</button>
            </div>
            <Button disabled={!isDirty || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Saving..." : "+ New"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <Card className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="grid gap-2 sm:max-w-sm">
                <h2 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-white">
                  Working hours
                  <span className="ml-2 rounded-[6px] bg-[#3b3b3b] px-2 py-1 align-middle text-xs font-medium text-white">
                    Default
                  </span>
                </h2>
                <p className="text-base text-[#d0d0d0]">Mon - Fri, 9:00 AM - 5:00 PM</p>
                <label className="text-sm text-[#b8b8b8]">Timezone</label>
                <Select value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}>
                  {timezoneOptions.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="secondary" size="icon">⋯</Button>
            </div>

            <div className="grid gap-3">
              {draft.schedule.map((row, index) => (
                <div
                  key={row.dayOfWeek}
                  className="grid gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--panel-muted)] p-4 sm:grid-cols-[160px_1fr_1fr] sm:items-center"
                >
                  <label className="flex items-center gap-3 text-sm font-medium text-white">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          schedule: current.schedule.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, isActive: event.target.checked } : entry
                          )
                        }))
                      }
                    />
                    {labelFor(row.dayOfWeek)}
                  </label>
                  <Input
                    type="time"
                    value={row.startTime}
                    disabled={!row.isActive}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        schedule: current.schedule.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, startTime: event.target.value } : entry
                        )
                      }))
                    }
                  />
                  <Input
                    type="time"
                    value={row.endTime}
                    disabled={!row.isActive}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        schedule: current.schedule.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, endTime: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            {mutation.isError ? (
              <p className="mt-4 rounded-md border border-red-500/25 bg-red-950/40 px-4 py-3 text-sm text-red-300">{mutation.error.message}</p>
            ) : null}
          </Card>

          <div className="text-center text-sm text-[#d0d0d0]">
            Temporarily out-of-office? <span className="underline">Add a redirect</span>
          </div>

          <div className="rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[#a8a8a8]">
            Date overrides are not available in the current backend, so this page intentionally stops at weekly hours.
          </div>
        </div>

        <Card className="self-end p-4">
          <h3 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-white">Try our Teams plan</h3>
          <p className="mt-2 text-base text-[#a8a8a8]">Remove Cal branding and get round robin scheduling + insights.</p>
          <div className="mt-5 flex gap-2">
            <Button size="sm">Try it for free</Button>
            <Button variant="secondary" size="sm">Learn more</Button>
          </div>
          <div className="mt-6 rounded-[12px] border border-[var(--border)] bg-white p-5 text-black">
            <div className="text-center text-sm font-semibold">This event is scheduled</div>
            <div className="mt-3 text-center text-xs text-neutral-500">We emailed you and the other attendee a calendar invitation.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
