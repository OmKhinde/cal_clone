"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CalendarIcon,
  ChevronDownIcon,
  CopyIcon,
  DotsHorizontalIcon,
  EditIcon,
  GlobeIcon,
  PlusIcon,
  TrashIcon
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import type { AvailabilityRow, DayOfWeek } from "@/lib/api/types";

const weekOrder: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const editorOrder: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const timezoneOptions = ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"];

function labelFor(day: DayOfWeek) {
  return day.slice(0, 1) + day.slice(1).toLowerCase();
}

function shortLabelFor(day: DayOfWeek) {
  return day.slice(0, 3).toLowerCase().replace(/^./, (char) => char.toUpperCase());
}

function buildDefaultSchedule(rows: AvailabilityRow[]) {
  return weekOrder.map((dayOfWeek) => rows.find((row) => row.dayOfWeek === dayOfWeek) ?? { dayOfWeek, startTime: "09:00", endTime: "17:00", isActive: false });
}

function formatTimeLabel(value: string) {
  const [hoursString = "0", minutes = "00"] = value.split(":");
  const hours = Number(hoursString);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 || 12;
  return `${normalized}:${minutes} ${suffix}`;
}

function summarizeAvailability(schedule: AvailabilityRow[]) {
  const activeDays = schedule.filter((row) => row.isActive);

  if (!activeDays.length) {
    return "No active weekly hours";
  }

  const weekdaysOnly =
    activeDays.length === 5 &&
    activeDays.every((row, index) => row.dayOfWeek === weekOrder[index]);

  const daysLabel = weekdaysOnly
    ? "Mon - Fri"
    : activeDays.map((row) => shortLabelFor(row.dayOfWeek)).join(", ");

  const firstRow = activeDays[0];
  return `${daysLabel}, ${formatTimeLabel(firstRow.startTime)} - ${formatTimeLabel(firstRow.endTime)}`;
}

function buildMockOverrideSummary() {
  return {
    title: "Thursday, April 23",
    hours: "9:00 AM - 5:00 PM"
  };
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
  const [editing, setEditing] = useState(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const mockOverride = buildMockOverrideSummary();

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const mutation = useMutation({
    mutationFn: () => api.replaceAvailability(draft),
    onSuccess: async (result) => {
      setDraft({
        timezone: result.timezone,
        schedule: buildDefaultSchedule(result.schedule)
      });
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["availability"] });
    }
  });

  function updateScheduleRow(index: number, updater: (row: AvailabilityRow) => AvailabilityRow) {
    setDraft((current) => ({
      ...current,
      schedule: current.schedule.map((entry, entryIndex) => (entryIndex === index ? updater(entry) : entry))
    }));
  }

  function openEditor() {
    setDraft(initial);
    setEditing(true);
  }

  function closeEditor() {
    if (mutation.isPending) return;
    setDraft(initial);
    setEditing(false);
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-14 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-[#a1a1aa] transition hover:bg-[var(--panel-soft)] hover:text-white"
                aria-label="Back"
              >
                <ChevronDownIcon className="h-4 w-4 rotate-90" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[31px] font-semibold tracking-[-0.045em] text-white">Working hours</h1>
                  <EditIcon className="h-4 w-4 text-[#a1a1aa]" />
                </div>
                <p className="mt-1 text-[14px] text-[#d4d4d8]">{summarizeAvailability(draft.schedule)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-3 text-[14px] font-medium text-white">
                <span>Set as default</span>
                <span className="relative inline-flex h-7 w-12 items-center rounded-full bg-[#e5e7eb] p-1">
                  <span className="ml-auto h-5 w-5 rounded-full bg-[#09090b]" />
                </span>
              </label>
              <div className="h-7 w-px bg-[var(--border)]" />
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(127,29,29,0.22)] text-[#fca5a5] transition hover:bg-[rgba(127,29,29,0.32)]"
                aria-label="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
              <div className="h-7 w-px bg-[var(--border)]" />
              <Button variant="dark" size="sm" onClick={() => mutation.mutate()} disabled={!isDirty || mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <Card className="p-4 sm:p-6">
            <div className="grid gap-4">
              {editorOrder.map((dayOfWeek) => {
                const actualIndex = draft.schedule.findIndex((entry) => entry.dayOfWeek === dayOfWeek);
                const row = draft.schedule[actualIndex];

                if (!row) {
                  return null;
                }

                  return (
                    <div
                      key={row.dayOfWeek}
                      className="grid gap-3 rounded-[12px] px-3 py-1.5 sm:grid-cols-[142px_minmax(0,1fr)] sm:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateScheduleRow(actualIndex, (current) => ({
                              ...current,
                              isActive: !current.isActive
                            }))
                          }
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
                            row.isActive
                              ? "bg-[#e5e7eb]"
                              : "bg-[#3b3b3b]"
                          }`}
                          aria-label={`Toggle ${labelFor(row.dayOfWeek)}`}
                        >
                          <span
                            className={`h-5 w-5 rounded-full bg-[#09090b] transition ${
                              row.isActive ? "ml-auto" : ""
                            }`}
                          />
                        </button>
                        <span className="text-[14px] font-medium text-white">{labelFor(row.dayOfWeek)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {row.isActive ? (
                          <>
                            <Input
                              type="time"
                              value={row.startTime}
                              className="h-[33px] w-[102px] rounded-[12px] px-3 text-[15px]"
                              onChange={(event) =>
                                updateScheduleRow(actualIndex, (current) => ({
                                  ...current,
                                  startTime: event.target.value
                                }))
                              }
                            />
                            <span className="text-[18px] text-[#a1a1aa]">-</span>
                            <Input
                              type="time"
                              value={row.endTime}
                              className="h-[33px] w-[102px] rounded-[12px] px-3 text-[15px]"
                              onChange={(event) =>
                                updateScheduleRow(actualIndex, (current) => ({
                                  ...current,
                                  endTime: event.target.value
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[22px] leading-none text-[#a1a1aa] transition hover:bg-[var(--panel-soft)] hover:text-white"
                              aria-label={`Add interval for ${labelFor(row.dayOfWeek)}`}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#a1a1aa] transition hover:bg-[var(--panel-soft)] hover:text-white"
                              aria-label={`Duplicate interval for ${labelFor(row.dayOfWeek)}`}
                            >
                              <CopyIcon className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card className="mt-6 p-6">
            <div className="flex items-start gap-2">
              <div>
                <h2 className="text-[16px] font-semibold text-white">Date overrides</h2>
                <p className="mt-1 text-[14px] text-[#a1a1aa]">
                  Add dates when your availability changes from your daily hours.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-white">{mockOverride.title}</p>
                  <p className="mt-1 text-[14px] text-[#a1a1aa]">{mockOverride.hours}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-[var(--border)] text-[#d4d4d8] transition hover:bg-[var(--panel-soft)]"
                    aria-label="Delete override"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] text-[#d4d4d8] transition hover:bg-[var(--panel-soft)]"
                    aria-label="Edit override"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <Button variant="secondary" size="sm" className="mt-4 h-9 px-3.5">
              <PlusIcon className="h-4 w-4" />
              Add an override
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="pt-14">
            <label className="grid gap-2 text-sm text-white">
              <span className="font-medium">Timezone</span>
              <Select value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}>
                {timezoneOptions.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="border-t border-[var(--border)]" />

          <Card className="p-4">
            <h3 className="text-[14px] font-semibold text-white">Something doesn't look right?</h3>
            <Button variant="secondary" size="sm" className="mt-4 h-9 px-3.5">
              Launch troubleshooter
            </Button>
          </Card>

          {mutation.isError ? (
            <p className="rounded-md border border-red-500/25 bg-red-950/40 px-4 py-3 text-sm text-red-300">{mutation.error.message}</p>
          ) : null}
        </div>
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
            <Button onClick={openEditor}>
              <PlusIcon className="h-4 w-4" />
              New
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <button
            type="button"
            onClick={openEditor}
            className="text-left"
          >
            <Card className="p-6 transition hover:border-[var(--border-strong)]">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-2 sm:max-w-sm">
                  <h2 className="text-[16px] font-semibold tracking-[-0.03em] text-white">
                  Working hours
                  <span className="ml-2 rounded-[6px] bg-[#3b3b3b] px-2 py-1 align-middle text-xs font-medium text-white">
                    Default
                  </span>
                  </h2>
                  <p className="text-[14px] text-[#d0d0d0]">{summarizeAvailability(initial.schedule)}</p>
                  <p className="inline-flex items-center gap-2 text-[14px] text-[#d4d4d8]">
                    <GlobeIcon className="h-4 w-4 text-[#a1a1aa]" />
                    {initial.timezone}
                  </p>
                </div>
                <Button variant="secondary" size="icon"><DotsHorizontalIcon className="h-4 w-4" /></Button>
              </div>
            </Card>
          </button>

          <div className="flex justify-center">
            <Button variant="secondary" size="sm" onClick={openEditor}>Working hours</Button>
          </div>

          <div className="text-center text-sm text-[#d0d0d0]">
            Temporarily out-of-office? <span className="underline">Add a redirect</span>
          </div>

          <div className="grid gap-3 rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[#a8a8a8]">
            <p className="font-medium text-white">Current backend scope</p>
            <p>
              This UI now matches Cal.com more closely, but the current backend still stores one weekly availability profile.
              Multiple named availability sets and date overrides are not available yet.
            </p>
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
