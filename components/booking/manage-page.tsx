"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookingCalendar } from "@/components/booking/calendar";
import { TimeSlotList } from "@/components/booking/time-slot-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { HttpError, api, createIdempotencyKey } from "@/lib/api/client";
import type { Slot } from "@/lib/api/types";

export function ManageBookingPage({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleRequestKey, setRescheduleRequestKey] = useState(() =>
    createIdempotencyKey("booking-reschedule")
  );

  const bookingQuery = useQuery({
    queryKey: ["manage-booking", token],
    queryFn: () => api.getManagedBooking(token)
  });

  const bookingData = bookingQuery.data;
  const canReschedule = bookingData?.status === "ACCEPTED";
  const dateParam = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  useEffect(() => {
    if (!bookingData?.start) {
      return;
    }

    setSelectedDate(new Date(bookingData.start));
    setSelectedSlot(null);
  }, [bookingData?.uid, bookingData?.start]);

  const slotsQuery = useQuery({
    queryKey: ["manage-booking-slots", bookingData?.eventType.id, dateParam],
    queryFn: () => api.getSlots(bookingData!.eventType.id, dateParam),
    enabled: Boolean(bookingData?.eventType.id) && canReschedule
  });

  const rescheduleSlots = useMemo(
    () =>
      (slotsQuery.data?.slots ?? []).map((slot) =>
        bookingData && slot.startTime === bookingData.start
          ? { ...slot, available: false }
          : slot
      ),
    [bookingData, slotsQuery.data?.slots]
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

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelManagedBooking(token, cancellationReason),
    onSuccess: async () => {
      queryClient.setQueryData(["manage-booking", token], (current: typeof bookingData) =>
        current
          ? {
              ...current,
              status: "CANCELLED",
              cancellationReason: cancellationReason || current.cancellationReason
            }
          : current
      );
      await queryClient.invalidateQueries({ queryKey: ["manage-booking", token] });
    }
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      api.rescheduleManagedBooking(
        token,
        selectedSlot!.startTime,
        rescheduleReason,
        rescheduleRequestKey
      ),
    onSuccess: async () => {
      queryClient.setQueryData(["manage-booking", token], (current: typeof bookingData) =>
        current
          ? {
              ...current,
              status: "CANCELLED",
              rescheduled: true,
              cancellationReason: rescheduleReason || "Rescheduled"
            }
          : current
      );
      await queryClient.invalidateQueries({ queryKey: ["manage-booking", token] });
      await queryClient.invalidateQueries({
        queryKey: ["manage-booking-slots", bookingData?.eventType.id, dateParam]
      });
      setSelectedSlot(null);
      setRescheduleReason("");
      setRescheduleRequestKey(createIdempotencyKey("booking-reschedule"));
    },
    onError: async () => {
      setSelectedSlot(null);
      await queryClient.invalidateQueries({ queryKey: ["manage-booking", token] });
      await queryClient.invalidateQueries({
        queryKey: ["manage-booking-slots", bookingData?.eventType.id, dateParam]
      });
    }
  });

  if (bookingQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-10">
        <Card className="w-full p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Booking not found</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This manage link is invalid or the booking is no longer available.
          </p>
        </Card>
      </div>
    );
  }

  const booking = bookingQuery.data;
  const canCancel = booking.status === "ACCEPTED" || booking.status === "PENDING";

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--panel-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              {booking.status}
            </span>
            <span className="text-sm font-medium text-[var(--muted)]">{booking.eventType.title}</span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Manage your meeting
          </h1>

          <div className="mt-6 grid gap-3 text-sm text-[var(--muted)]">
            <p>
              <span className="font-semibold text-[var(--foreground)]">Guest:</span>{" "}
              {booking.attendee?.name ?? booking.title}
            </p>
            <p>
              <span className="font-semibold text-[var(--foreground)]">Email:</span>{" "}
              {booking.attendee?.email}
            </p>
            <p>
              <span className="font-semibold text-[var(--foreground)]">When:</span>{" "}
              {format(new Date(booking.start), "PPP p")} to{" "}
              {format(new Date(booking.end), "p")}
            </p>
            <p>
              <span className="font-semibold text-[var(--foreground)]">Host:</span>{" "}
              {booking.hosts.map((host) => host.name).join(", ")}
            </p>
            {booking.meetingUrl ? (
              <p>
                <span className="font-semibold text-[var(--foreground)]">Meeting URL:</span>{" "}
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--accent)] underline underline-offset-4"
                >
                  Join meeting
                </a>
              </p>
            ) : null}
            {booking.cancellationReason ? (
              <p>
                <span className="font-semibold text-[var(--foreground)]">Cancellation reason:</span>{" "}
                {booking.cancellationReason}
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Reschedule this meeting</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Accepted bookings can be moved to a new time from this page.
          </p>

          {canReschedule ? (
            <div className="mt-5 grid gap-4">
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

                  {slotsQuery.isLoading ? (
                    <Skeleton className="h-72 w-full" />
                  ) : slotsQuery.isError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                      We could not refresh availability right now. Please try again in a moment.
                    </p>
                  ) : (
                    <TimeSlotList
                      slots={rescheduleSlots}
                      selectedStartTime={selectedSlot?.startTime}
                      onSelect={setSelectedSlot}
                    />
                  )}
                </Card>
              </div>

              {selectedSlot ? (
                <p className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
                  Selected time: {selectedSlot.label} on {format(new Date(selectedSlot.startTime), "PPP")}
                </p>
              ) : null}

              {!selectedSlot ? (
                <p className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
                  Pick a new open time to move this booking.
                </p>
              ) : null}

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">Reason</span>
                <Textarea
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  placeholder="Optional reason for the reschedule"
                />
              </label>

              {rescheduleMutation.isError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {rescheduleMutation.error instanceof HttpError
                    ? rescheduleMutation.error.message
                    : "Rescheduling failed. Please refresh availability and try again."}
                </p>
              ) : null}

              {rescheduleMutation.isSuccess ? (
                <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  <p>
                    Your meeting was moved to{" "}
                    {format(new Date(rescheduleMutation.data.start), "PPP p")}.
                  </p>
                  <Link
                    href={`/booking/manage/${rescheduleMutation.data.cancelToken ?? rescheduleMutation.data.uid}`}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[#7aa2ff] hover:bg-white"
                  >
                    Manage new booking
                  </Link>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  disabled={
                    !selectedSlot ||
                    !selectedSlotStillAvailable ||
                    rescheduleMutation.isPending ||
                    slotsQuery.isLoading
                  }
                  onClick={() => rescheduleMutation.mutate()}
                >
                  {rescheduleMutation.isPending ? "Rescheduling..." : "Reschedule meeting"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
              Only accepted bookings can be rescheduled from the manage page.
            </p>
          )}
        </Card>

        <Card className="p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Cancel this meeting</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            You can cancel pending or accepted bookings from this page.
          </p>

          {canCancel ? (
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">Reason</span>
                <Textarea
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  placeholder="Optional reason for the cancellation"
                />
              </label>

              {cancelMutation.isError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {cancelMutation.error.message}
                </p>
              ) : null}

              {bookingQuery.data.status === "CANCELLED" ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  This meeting has been cancelled.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="danger"
                  disabled={cancelMutation.isPending || rescheduleMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  {cancelMutation.isPending ? "Cancelling..." : "Cancel meeting"}
                </Button>
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[#7aa2ff] hover:bg-white"
                >
                  Back home
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
              This booking can no longer be cancelled from the manage page.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
