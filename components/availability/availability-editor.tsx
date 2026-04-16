"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CalendarIcon,
  CopyIcon,
  DotsHorizontalIcon,
  EditIcon,
  GlobeIcon,
  PlusIcon,
  TrashIcon
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import type { AvailabilityRow, DayOfWeek } from "@/lib/api/types";

const weekOrder: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const editorOrder: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const timezoneOptions = ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"];
const availabilityOverridesStorageKey = "availability-editor-overrides";

type AvailabilityOverride = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

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

function formatOverrideSummary(override: AvailabilityOverride) {
  return {
    title: format(new Date(`${override.date}T00:00:00`), "EEEE, MMMM d"),
    hours: `${formatTimeLabel(override.startTime)} - ${formatTimeLabel(override.endTime)}`
  };
}

function createDefaultOverrides(): AvailabilityOverride[] {
  return [
    {
      id: "default-override",
      date: "2026-04-23",
      startTime: "09:00",
      endTime: "17:00"
    }
  ];
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
  const [creating, setCreating] = useState(false);
  const [scheduleName, setScheduleName] = useState("Working hours");
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);
  const [overrideDraft, setOverrideDraft] = useState({
    date: "2026-04-23",
    startTime: "09:00",
    endTime: "17:00"
  });
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(availabilityOverridesStorageKey);

    if (!saved) {
      const defaults = createDefaultOverrides();
      setOverrides(defaults);
      window.localStorage.setItem(availabilityOverridesStorageKey, JSON.stringify(defaults));
      return;
    }

    try {
      const parsed = JSON.parse(saved) as AvailabilityOverride[];
      setOverrides(Array.isArray(parsed) && parsed.length ? parsed : createDefaultOverrides());
    } catch {
      const defaults = createDefaultOverrides();
      setOverrides(defaults);
      window.localStorage.setItem(availabilityOverridesStorageKey, JSON.stringify(defaults));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(availabilityOverridesStorageKey, JSON.stringify(overrides));
  }, [overrides]);

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

  function openCreateModal() {
    setScheduleName("Working hours");
    setCreating(true);
  }

  function closeEditor() {
    if (mutation.isPending) return;
    setDraft(initial);
    setEditing(false);
  }

  function openOverrideModal(override?: AvailabilityOverride) {
    if (override) {
      setEditingOverrideId(override.id);
      setOverrideDraft({
        date: override.date,
        startTime: override.startTime,
        endTime: override.endTime
      });
    } else {
      setEditingOverrideId(null);
      setOverrideDraft({
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "17:00"
      });
    }

    setOverrideModalOpen(true);
  }

  function saveOverride() {
    const nextOverride: AvailabilityOverride = {
      id: editingOverrideId ?? `override-${Date.now()}`,
      date: overrideDraft.date,
      startTime: overrideDraft.startTime,
      endTime: overrideDraft.endTime
    };

    setOverrides((current) => {
      const next = editingOverrideId
        ? current.map((item) => (item.id === editingOverrideId ? nextOverride : item))
        : [...current, nextOverride];

      return next.sort((left, right) => left.date.localeCompare(right.date));
    });

    setOverrideModalOpen(false);
    setEditingOverrideId(null);
  }

  function deleteOverride(id: string) {
    setOverrides((current) => current.filter((item) => item.id !== id));
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
      <>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_288px]">
          <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <BackButton
                fallbackHref="/availability"
                label=""
                className="mt-0.5 h-8 w-8 rounded-full border border-transparent px-0 text-[#d5d9e1] hover:border-[var(--border)] hover:bg-[var(--panel-soft)]"
                onBack={closeEditor}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[2rem] font-semibold tracking-[-0.045em] text-white">{scheduleName}</h1>
                  <EditIcon className="h-4 w-4 text-[#8d93a0]" />
                </div>
                <p className="mt-1 text-[15px] text-[#d4d4d8]">{summarizeAvailability(draft.schedule)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 text-[14px] font-medium text-white">
                <span>Set as default</span>
                <span className="relative inline-flex h-7 w-12 items-center rounded-full bg-[#3a3c40] p-1">
                  <span className="h-5 w-5 rounded-full bg-[#09090b]" />
                </span>
              </label>
              <div className="h-7 w-px bg-[#2f3338]" />
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[rgba(127,29,29,0.22)] text-[#fca5a5] transition hover:bg-[rgba(127,29,29,0.32)]"
                aria-label="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
              <div className="h-7 w-px bg-[#2f3338]" />
              <Button
                variant="dark"
                size="sm"
                className="h-10 rounded-[12px] border-[#2f3338] bg-[#2a2c30] px-4"
                onClick={() => mutation.mutate()}
                disabled={!isDirty || mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <Card className="border-[#26292f] p-4 sm:p-5">
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
                      className="grid gap-3 rounded-[12px] px-3 py-1.5 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center"
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
                          className={`relative inline-flex h-7 w-11 shrink-0 items-center rounded-full p-1 transition ${
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
                              className="h-9 w-[102px] rounded-[14px] border-[#3a3d43] bg-[#111214] px-3 text-[15px]"
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
                              className="h-9 w-[102px] rounded-[14px] border-[#3a3d43] bg-[#111214] px-3 text-[15px]"
                              onChange={(event) =>
                                updateScheduleRow(actualIndex, (current) => ({
                                  ...current,
                                  endTime: event.target.value
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[22px] leading-none text-[#c8ccd4] transition hover:bg-[var(--panel-soft)] hover:text-white"
                              aria-label={`Add interval for ${labelFor(row.dayOfWeek)}`}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#c8ccd4] transition hover:bg-[var(--panel-soft)] hover:text-white"
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

          <Card className="mt-6 border-[#26292f] p-6">
            <div className="flex items-start gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-semibold text-white">Date overrides</h2>
                  <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border border-[#6c7280] text-[10px] font-semibold text-[#c7cdd8]">
                    i
                  </span>
                </div>
                <p className="mt-1 text-[14px] text-[#a1a1aa]">
                  Add dates when your availability changes from your daily hours.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {overrides.map((override) => {
                const summary = formatOverrideSummary(override);

                return (
                  <div key={override.id} className="rounded-[14px] border border-[#26292f] bg-[#111214] px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-white">{summary.title}</p>
                        <p className="mt-1 text-[14px] text-[#a1a1aa]">{summary.hours}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#2f3338] text-[#d4d4d8] transition hover:bg-[var(--panel-soft)]"
                          aria-label="Delete override"
                          onClick={() => deleteOverride(override.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] text-[#d4d4d8] transition hover:bg-[var(--panel-soft)]"
                          aria-label="Edit override"
                          onClick={() => openOverrideModal(override)}
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="secondary" size="sm" className="mt-4 h-9 rounded-[12px] border-[#3a3d43] bg-[#2a2c30] px-3.5" onClick={() => openOverrideModal()}>
              <PlusIcon className="h-4 w-4" />
              Add an override
            </Button>
          </Card>
        </div>

          <div className="space-y-6">
            <div className="pt-20">
              <label className="grid gap-2 text-sm text-white">
                <span className="font-medium text-[15px]">Timezone</span>
                <Select className="h-11 rounded-[14px] border-[#3a3d43] bg-[#111214]" value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}>
                  {timezoneOptions.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="border-t border-[#26292f]" />

            <Card className="border-[#26292f] p-4">
              <h3 className="text-[14px] font-semibold text-white">Something doesn't look right?</h3>
              <Button variant="secondary" size="sm" className="mt-4 h-9 rounded-[12px] border-[#3a3d43] px-3.5">
                Launch troubleshooter
              </Button>
            </Card>

            {mutation.isError ? (
              <p className="rounded-md border border-red-500/25 bg-red-950/40 px-4 py-3 text-sm text-red-300">{mutation.error.message}</p>
            ) : null}
          </div>
        </div>

        <Modal
          open={overrideModalOpen}
          onClose={() => setOverrideModalOpen(false)}
          title={editingOverrideId ? "Edit override" : "Add an override"}
          description="Overrides are stored locally in this UI until backend support is added."
        >
          <div className="grid gap-6">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-white">Date</span>
              <Input
                type="date"
                value={overrideDraft.date}
                onChange={(event) => setOverrideDraft((current) => ({ ...current, date: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-white">Start time</span>
                <Input
                  type="time"
                  value={overrideDraft.startTime}
                  onChange={(event) => setOverrideDraft((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-white">End time</span>
                <Input
                  type="time"
                  value={overrideDraft.endTime}
                  onChange={(event) => setOverrideDraft((current) => ({ ...current, endTime: event.target.value }))}
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button type="button" variant="ghost" onClick={() => setOverrideModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveOverride}
                disabled={!overrideDraft.date || !overrideDraft.startTime || !overrideDraft.endTime}
              >
                Save override
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Availability"
        description="Configure times when you are available for bookings."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex rounded-[12px] bg-[var(--panel-soft)] p-1">
              <button className="rounded-[10px] border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm text-white">My availability</button>
              <button className="rounded-[10px] px-3 py-1.5 text-sm text-[#c8c8c8]">Team availability</button>
            </div>
            <Button onClick={openCreateModal}>
              <PlusIcon className="h-4 w-4" />
              New
            </Button>
          </div>
        }
      />

      <div className="grid gap-5">
          <div
            role="button"
            tabIndex={0}
            onClick={openEditor}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openEditor();
              }
            }}
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
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <DotsHorizontalIcon className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a new schedule"
      >
        <div className="grid gap-6">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-white">Name</span>
            <Input
              value={scheduleName}
              onChange={(event) => setScheduleName(event.target.value)}
              placeholder="Working hours"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCreating(false);
                openEditor();
              }}
              disabled={!scheduleName.trim()}
            >
              Continue
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title={editingOverrideId ? "Edit override" : "Add an override"}
        description="Overrides are stored locally in this UI until backend support is added."
      >
        <div className="grid gap-6">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-white">Date</span>
            <Input
              type="date"
              value={overrideDraft.date}
              onChange={(event) => setOverrideDraft((current) => ({ ...current, date: event.target.value }))}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-white">Start time</span>
              <Input
                type="time"
                value={overrideDraft.startTime}
                onChange={(event) => setOverrideDraft((current) => ({ ...current, startTime: event.target.value }))}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-white">End time</span>
              <Input
                type="time"
                value={overrideDraft.endTime}
                onChange={(event) => setOverrideDraft((current) => ({ ...current, endTime: event.target.value }))}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Button type="button" variant="ghost" onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveOverride}
              disabled={!overrideDraft.date || !overrideDraft.startTime || !overrideDraft.endTime}
            >
              Save override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
