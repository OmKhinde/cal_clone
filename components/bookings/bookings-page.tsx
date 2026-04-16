"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookingCalendar } from "@/components/booking/calendar";
import { TimeSlotList } from "@/components/booking/time-slot-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, createIdempotencyKey } from "@/lib/api/client";
import type { Booking, BookingListResponse, Slot } from "@/lib/api/types";

const tabs = ["upcoming", "pending", "past", "cancelled"] as const;

export function BookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof tabs)[number]>("upcoming");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", status],
    queryFn: () => api.listBookings(status)
  });

  const updateBookingListCache = (
    tab: (typeof tabs)[number],
    updater: (current: BookingListResponse) => BookingListResponse
  ) => {
    queryClient.setQueryData<BookingListResponse>(["bookings", tab], (current) => {
      if (!current) {
        return current;
      }

      return updater(current);
    });
  };

  const removeBookingFromTab = (tab: (typeof tabs)[number], bookingUid: string) => {
    updateBookingListCache(tab, (current) => {
      const nextData = current.data.filter((booking) => booking.uid !== bookingUid);

      return {
        ...current,
        data: nextData,
        meta: {
          ...current.meta,
          total: Math.max(current.meta.total - (current.data.length - nextData.length), 0)
        }
      };
    });
  };

  const prependBookingToTab = (tab: (typeof tabs)[number], booking: Booking) => {
    updateBookingListCache(tab, (current) => {
      const nextData = [booking, ...current.data.filter((item) => item.uid !== booking.uid)];

      return {
        ...current,
        data: nextData,
        meta: {
          ...current.meta,
          total: current.data.some((item) => item.uid === booking.uid)
            ? current.meta.total
            : current.meta.total + 1
        }
      };
    });
  };

  const addBookingToMatchingTab = (booking: Booking) => {
    if (booking.status === "CANCELLED") {
      prependBookingToTab("cancelled", booking);
      return;
    }

    if (booking.status === "PENDING") {
      prependBookingToTab("pending", booking);
      return;
    }

    const isPast = new Date(booking.start).getTime() < Date.now();
    prependBookingToTab(isPast ? "past" : "upcoming", booking);
  };

  const invalidateBookings = async () => {
    await Promise.all(
      tabs.map((tab) => queryClient.invalidateQueries({ queryKey: ["bookings", tab] }))
    );
  };

  const cancelMutation = useMutation({
    mutationFn: ({ uid, reason }: { uid: string; reason?: string }) => api.cancelBooking(uid, reason),
    onSuccess: async (cancelledBooking) => {
      removeBookingFromTab("upcoming", cancelledBooking.uid);
      removeBookingFromTab("pending", cancelledBooking.uid);
      removeBookingFromTab("past", cancelledBooking.uid);
      prependBookingToTab("cancelled", cancelledBooking);
      await invalidateBookings();
      setExpandedUid(null);
      setCancelReason("");
    }
  });

  const confirmMutation = useMutation({
    mutationFn: api.confirmBooking,
    onSuccess: invalidateBookings
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ uid, start, requestKey }: { uid: string; start: string; requestKey: string }) =>
      api.rescheduleBooking(uid, start, undefined, requestKey),
    onSuccess: async (updatedBooking, variables) => {
      removeBookingFromTab("upcoming", variables.uid);
      removeBookingFromTab("pending", variables.uid);
      removeBookingFromTab("past", variables.uid);
      removeBookingFromTab("cancelled", updatedBooking.uid);
      addBookingToMatchingTab(updatedBooking);
      await invalidateBookings();
      setExpandedUid(null);
      setCancelReason("");
    },
    onError: invalidateBookings
  });

  return (
    <div>
      <PageHeader
        eyebrow="Bookings"
        title="Calendar activity"
        description="Review accepted and pending bookings, confirm requests, cancel with context, and reschedule from the host dashboard."
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm">Saved filters</Button>
            <Button variant="dark" size="icon">☰</Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatus(tab)}
              className={`rounded-[10px] px-4 py-2 text-sm font-medium capitalize transition ${
                status === tab
                  ? "border border-[var(--border)] bg-[var(--panel-soft)] text-white"
                  : "text-[#c8c8c8] hover:bg-[var(--panel-soft)] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm">Filter</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card className="min-h-[380px] p-0">
          <div className="max-h-[42rem] overflow-y-auto pr-1">
          <div className="grid gap-4 p-4">
            {data?.data.map((booking) => {
              const expanded = expandedUid === booking.uid;

              return (
                <BookingCard
                  key={booking.uid}
                  booking={booking}
                  expanded={expanded}
                  cancelReason={cancelReason}
                  onExpand={() => setExpandedUid(expanded ? null : booking.uid)}
                  onCancelReasonChange={setCancelReason}
                  onCancel={() => cancelMutation.mutate({ uid: booking.uid, reason: cancelReason })}
                  onConfirm={() => confirmMutation.mutate(booking.uid)}
                  onReschedule={(start, requestKey) =>
                    rescheduleMutation.mutate({ uid: booking.uid, start, requestKey })
                  }
                  busy={cancelMutation.isPending || confirmMutation.isPending || rescheduleMutation.isPending}
                />
              );
            })}

            {!data?.data.length ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-18 w-18 items-center justify-center rounded-full bg-[#3b3b3b] text-3xl text-white/90">◫</div>
                <h2 className="mt-6 text-[2rem] font-semibold tracking-[-0.04em] text-white">No {status} bookings</h2>
                <p className="mt-3 max-w-xl text-base text-[#c7c7c7]">
                  You have no {status} bookings. As soon as someone books a time with you it will show up here.
                </p>
              </div>
            ) : null}
          </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  expanded,
  cancelReason,
  onExpand,
  onCancelReasonChange,
  onCancel,
  onConfirm,
  onReschedule,
  busy
}: {
  booking: Booking;
  expanded: boolean;
  cancelReason: string;
  onExpand: () => void;
  onCancelReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onReschedule: (start: string, requestKey: string) => void;
  busy: boolean;
}) {
  const canReschedule = booking.status === "ACCEPTED";

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-[6px] bg-[#2a2a2a] px-2.5 py-1 text-xs font-medium text-[#c8c8c8]">
              {booking.status}
            </span>
            <span className="text-xs font-medium text-[#a7a7a7]">{booking.eventType.title}</span>
            {booking.videoCallUrl ? <span className="text-xs font-medium text-[#a7a7a7]">Video ready</span> : null}
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
            {booking.attendee?.name ?? booking.title}
          </h2>
          <p className="mt-1 text-sm text-[#b8b8b8]">{booking.attendee?.email}</p>
          <p className="mt-3 text-sm font-medium text-[#ededed]">
            {format(new Date(booking.start), "PPP p")} to {format(new Date(booking.end), "p")}
          </p>
          {booking.description ? <p className="mt-2 text-sm text-[#b8b8b8]">{booking.description}</p> : null}
          {booking.guests.length ? <p className="mt-2 text-sm text-[#b8b8b8]">Guests: {booking.guests.join(", ")}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {booking.status === "PENDING" ? (
            <Button disabled={busy} onClick={onConfirm}>
              Confirm
            </Button>
          ) : null}
          {(booking.status === "ACCEPTED" || booking.status === "PENDING") ? (
            <Button variant="danger" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onExpand}>
            {expanded ? "Hide details" : "Manage"}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5">
          <div className="grid gap-2 text-sm text-[#b8b8b8]">
            <p><span className="font-semibold text-white">Host:</span> {booking.hosts.map((host) => host.name).join(", ")}</p>
            <p><span className="font-semibold text-white">UID:</span> {booking.uid}</p>
            {booking.meetingUrl ? <p><span className="font-semibold text-white">Meeting URL:</span> {booking.meetingUrl}</p> : null}
            {booking.cancellationReason ? <p><span className="font-semibold text-white">Cancellation reason:</span> {booking.cancellationReason}</p> : null}
          </div>

          {(booking.status === "ACCEPTED" || booking.status === "PENDING") ? (
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-white">Cancel reason</span>
              <Textarea value={cancelReason} onChange={(event) => onCancelReasonChange(event.target.value)} />
            </label>
          ) : null}

          {canReschedule ? (
            <RescheduleBookingPanel booking={booking} onReschedule={onReschedule} busy={busy} />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function RescheduleBookingPanel({
  booking,
  onReschedule,
  busy
}: {
  booking: Booking;
  onReschedule: (start: string, requestKey: string) => void;
  busy: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date(booking.start));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [requestKey, setRequestKey] = useState(() => createIdempotencyKey("booking-reschedule"));
  const dateParam = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  useEffect(() => {
    setSelectedDate(new Date(booking.start));
    setSelectedSlot(null);
  }, [booking.uid, booking.start]);

  const slotsQuery = useQuery({
    queryKey: ["booking-reschedule-slots", booking.uid, booking.eventType.id, dateParam],
    queryFn: () => api.getSlots(booking.eventType.id, dateParam),
    enabled: booking.status === "ACCEPTED"
  });

  const rescheduleSlots = useMemo(
    () =>
      (slotsQuery.data?.slots ?? []).map((slot) =>
        slot.startTime === booking.start ? { ...slot, available: false } : slot
      ),
    [booking.start, slotsQuery.data?.slots]
  );

  const selectedSlotStillAvailable = Boolean(
    selectedSlot &&
      rescheduleSlots.some(
        (slot) => slot.startTime === selectedSlot.startTime && slot.available
      )
  );

  useEffect(() => {
    if (!selectedSlot || selectedSlotStillAvailable) {
      return;
    }

    setSelectedSlot(null);
  }, [selectedSlot, selectedSlotStillAvailable]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <BookingCalendar
          value={selectedDate}
          onChange={(date) => {
            setSelectedDate(date);
            setSelectedSlot(null);
          }}
        />

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {format(selectedDate, "EEEE, MMMM d")}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {slotsQuery.data?.timezone ?? "Loading timezone..."}
              </p>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto pr-1">
            {slotsQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : slotsQuery.isError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Availability could not be refreshed right now. Try again in a moment.
              </p>
            ) : (
              <TimeSlotList
                slots={rescheduleSlots}
                selectedStartTime={selectedSlot?.startTime}
                onSelect={setSelectedSlot}
              />
            )}
          </div>
        </Card>
      </div>

      {selectedSlot ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
          Selected time: {selectedSlot.label} on {format(new Date(selectedSlot.startTime), "PPP")}
        </p>
      ) : (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
          Pick a new open time to move this booking.
        </p>
      )}

      <div>
        <Button
          variant="secondary"
          disabled={!selectedSlot || !selectedSlotStillAvailable || busy || slotsQuery.isLoading}
          onClick={() => {
            if (!selectedSlotStillAvailable) {
              return;
            }

            onReschedule(selectedSlot!.startTime, requestKey);
            setRequestKey(createIdempotencyKey("booking-reschedule"));
          }}
        >
          Reschedule booking
        </Button>
      </div>
    </div>
  );
}
