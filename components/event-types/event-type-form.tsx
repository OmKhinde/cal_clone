"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import type { BookingLimitFrequency, EventType, EventTypePayload, PeriodType, SchedulingType } from "@/lib/api/types";

const timezoneOptions = ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"];

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function EventTypeForm({
  eventType,
  onDone
}: {
  eventType?: EventType;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: eventType?.title ?? "",
    description: eventType?.description ?? "",
    duration: eventType?.duration ?? 30,
    slug: eventType?.slug ?? "",
    color: eventType?.color ?? "#111827",
    schedulingType: eventType?.schedulingType ?? ("INDIVIDUAL" as SchedulingType),
    maxAttendees: eventType?.maxAttendees ?? null,
    timeZone: eventType?.timeZone ?? "",
    periodType: eventType?.periodType ?? ("ROLLING" as PeriodType),
    periodDays: eventType?.periodDays ?? 30,
    periodStartDate: toDateTimeLocal(eventType?.periodStartDate),
    periodEndDate: toDateTimeLocal(eventType?.periodEndDate),
    minimumBookingNotice: eventType?.minimumBookingNotice ?? 0,
    beforeEventBuffer: eventType?.beforeEventBuffer ?? 0,
    afterEventBuffer: eventType?.afterEventBuffer ?? 0,
    bookingLimitEnabled: eventType?.bookingLimitEnabled ?? false,
    bookingLimitCount: eventType?.bookingLimitCount ?? 3,
    bookingLimitFrequency: eventType?.bookingLimitFrequency ?? ("DAY" as BookingLimitFrequency),
    locationTypes: eventType?.locations?.map((item) => item.type).join(", ") ?? "",
    isHidden: eventType?.isHidden ?? false,
    requiresConfirmation: eventType?.requiresConfirmation ?? false,
    paymentEnabled: eventType?.paymentEnabled ?? false,
    price: eventType?.price ?? 0,
    currency: eventType?.currency ?? "usd",
    successRedirectUrl: eventType?.successRedirectUrl ?? ""
  });

  const payload = useMemo<EventTypePayload>(() => {
    return {
      title: form.title,
      description: form.description || null,
      duration: Number(form.duration),
      slug: form.slug,
      color: form.color,
      schedulingType: form.schedulingType,
      maxAttendees: null,
      timeZone: form.timeZone || null,
      periodType: form.periodType,
      periodDays: form.periodType === "ROLLING" ? Number(form.periodDays) : null,
      periodStartDate: form.periodType === "RANGE" && form.periodStartDate ? new Date(form.periodStartDate).toISOString() : null,
      periodEndDate: form.periodType === "RANGE" && form.periodEndDate ? new Date(form.periodEndDate).toISOString() : null,
      minimumBookingNotice: Number(form.minimumBookingNotice),
      beforeEventBuffer: Number(form.beforeEventBuffer),
      afterEventBuffer: Number(form.afterEventBuffer),
      bookingLimitEnabled: form.bookingLimitEnabled,
      bookingLimitCount: form.bookingLimitEnabled ? Number(form.bookingLimitCount) : null,
      bookingLimitFrequency: form.bookingLimitEnabled ? form.bookingLimitFrequency : null,
      locations: form.locationTypes
        ? form.locationTypes
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((type) => ({ type }))
        : null,
      isHidden: form.isHidden,
      requiresConfirmation: form.requiresConfirmation,
      paymentEnabled: form.paymentEnabled,
      price: Number(form.price),
      currency: form.currency,
      successRedirectUrl: form.successRedirectUrl || null
    };
  }, [form]);

  const mutation = useMutation({
    mutationFn: async () => {
      return eventType ? api.updateEventType(eventType.id, payload) : api.createEventType(payload);
    },
    onSuccess: async (savedEventType) => {
      queryClient.setQueryData<EventType[]>(["event-types"], (current) => {
        if (!current) {
          return [savedEventType];
        }

        if (eventType) {
          return current.map((item) => (item.id === savedEventType.id ? savedEventType : item));
        }

        return [savedEventType, ...current.filter((item) => item.id !== savedEventType.id)];
      });
      await queryClient.invalidateQueries({ queryKey: ["event-types"] });
      onDone();
    }
  });

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Title</span>
          <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Slug</span>
          <Input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} required />
        </label>
        <label className="grid gap-2 text-sm sm:col-span-2">
          <span className="font-semibold text-[var(--foreground)]">Description</span>
          <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Duration</span>
          <Input type="number" min={5} step={5} value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Scheduling</span>
          <Input value="Individual" disabled />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Color</span>
          <Input
            type="color"
            value={form.color}
            onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
            className="p-1"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Event timezone</span>
          <Select value={form.timeZone} onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}>
            <option value="">Use host timezone</option>
            {timezoneOptions.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Period type</span>
          <Select value={form.periodType} onChange={(event) => setForm((current) => ({ ...current, periodType: event.target.value as PeriodType }))}>
            <option value="ROLLING">Rolling</option>
            <option value="UNLIMITED">Unlimited</option>
            <option value="RANGE">Date range</option>
          </Select>
        </label>
      </div>

      {form.periodType === "ROLLING" ? (
        <label className="grid gap-2 text-sm sm:max-w-xs">
          <span className="font-semibold text-[var(--foreground)]">Rolling window days</span>
          <Input type="number" min={1} value={form.periodDays} onChange={(event) => setForm((current) => ({ ...current, periodDays: Number(event.target.value) }))} />
        </label>
      ) : null}

      {form.periodType === "RANGE" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-[var(--foreground)]">Start date</span>
            <Input type="datetime-local" value={form.periodStartDate} onChange={(event) => setForm((current) => ({ ...current, periodStartDate: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-[var(--foreground)]">End date</span>
            <Input type="datetime-local" value={form.periodEndDate} onChange={(event) => setForm((current) => ({ ...current, periodEndDate: event.target.value }))} />
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Minimum notice (min)</span>
          <Input type="number" min={0} value={form.minimumBookingNotice} onChange={(event) => setForm((current) => ({ ...current, minimumBookingNotice: Number(event.target.value) }))} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Before buffer</span>
          <Input type="number" min={0} value={form.beforeEventBuffer} onChange={(event) => setForm((current) => ({ ...current, beforeEventBuffer: Number(event.target.value) }))} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">After buffer</span>
          <Input type="number" min={0} value={form.afterEventBuffer} onChange={(event) => setForm((current) => ({ ...current, afterEventBuffer: Number(event.target.value) }))} />
        </label>
      </div>

      <div className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-[var(--panel-muted)] p-5">
        <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={form.bookingLimitEnabled} onChange={(event) => setForm((current) => ({ ...current, bookingLimitEnabled: event.target.checked }))} />
          Limit bookings by period
        </label>
        {form.bookingLimitEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">Limit count</span>
              <Input type="number" min={1} value={form.bookingLimitCount} onChange={(event) => setForm((current) => ({ ...current, bookingLimitCount: Number(event.target.value) }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">Frequency</span>
              <Select value={form.bookingLimitFrequency} onChange={(event) => setForm((current) => ({ ...current, bookingLimitFrequency: event.target.value as BookingLimitFrequency }))}>
                <option value="DAY">Per day</option>
                <option value="WEEK">Per week</option>
                <option value="MONTH">Per month</option>
              </Select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Location types</span>
          <Input value={form.locationTypes} onChange={(event) => setForm((current) => ({ ...current, locationTypes: event.target.value }))} placeholder="google-meet, zoom" />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">Success redirect URL</span>
          <Input value={form.successRedirectUrl} onChange={(event) => setForm((current) => ({ ...current, successRedirectUrl: event.target.value }))} placeholder="https://example.com/thanks" />
        </label>
      </div>

      <div className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-[var(--panel-muted)] p-5">
        <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={form.isHidden} onChange={(event) => setForm((current) => ({ ...current, isHidden: event.target.checked }))} />
          Hide from profile
        </label>
        <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={form.requiresConfirmation} onChange={(event) => setForm((current) => ({ ...current, requiresConfirmation: event.target.checked }))} />
          Require confirmation
        </label>
        <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={form.paymentEnabled} onChange={(event) => setForm((current) => ({ ...current, paymentEnabled: event.target.checked }))} />
          Payment enabled
        </label>
        {form.paymentEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">Price</span>
              <Input type="number" min={0} value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">Currency</span>
              <Input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} />
            </label>
          </div>
        ) : null}
      </div>

      {mutation.isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{mutation.error.message}</p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Saving..." : eventType ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
