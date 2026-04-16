"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookingCalendar } from "@/components/booking/calendar";
import { TimeSlotList } from "@/components/booking/time-slot-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HttpError, api, createIdempotencyKey } from "@/lib/api/client";
import type { Slot } from "@/lib/api/types";

export function PublicBookingPage({ username, eventSlug }: { username: string; eventSlug: string }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [guestInput, setGuestInput] = useState("");
  const [bookingRequestKey, setBookingRequestKey] = useState(() => createIdempotencyKey("booking"));
  const [form, setForm] = useState({
    name: "",
    email: "",
    notes: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    language: typeof navigator !== "undefined" ? navigator.language : "en",
    responses: {} as Record<string, unknown>
  });

  const eventQuery = useQuery({
    queryKey: ["public-event", username, eventSlug],
    queryFn: () => api.getPublicEvent(username, eventSlug)
  });

  const dateParam = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  const slotsQuery = useQuery({
    queryKey: ["slots", eventQuery.data?.id, dateParam],
    queryFn: () => api.getSlots(eventQuery.data!.id, dateParam),
    enabled: Boolean(eventQuery.data?.id)
  });

  const selectedSlotStillAvailable = Boolean(
    selectedSlot &&
      slotsQuery.data?.slots.some(
        (slot) => slot.startTime === selectedSlot.startTime && slot.available
      )
  );

  const bookingMutation = useMutation({
    mutationFn: async () =>
      api.createBooking(
        {
          eventTypeId: eventQuery.data!.id,
          start: selectedSlot!.startTime,
          attendee: {
            name: form.name,
            email: form.email,
            timeZone: form.timezone,
            language: form.language
          },
          guests: guestInput
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          location: eventQuery.data?.locations[0]?.type ?? null,
          notes: form.notes || null,
          responses: {
            name: form.name,
            email: form.email,
            notes: form.notes,
            ...form.responses
          },
          metadata: {
            source: "web_frontend"
          }
        },
        bookingRequestKey
      ),
    onSuccess: async () => {
      setSelectedSlot(null);
      setGuestInput("");
      setBookingRequestKey(createIdempotencyKey("booking"));
      setForm((current) => ({ ...current, name: "", email: "", notes: "", responses: {} }));
      await queryClient.invalidateQueries({ queryKey: ["slots", eventQuery.data?.id, dateParam] });
    },
    onError: async () => {
      setSelectedSlot(null);
      await queryClient.invalidateQueries({ queryKey: ["slots", eventQuery.data?.id, dateParam] });
    }
  });

  useEffect(() => {
    if (!selectedSlot || selectedSlotStillAvailable) {
      return;
    }

    setSelectedSlot(null);
  }, [selectedSlot, selectedSlotStillAvailable]);

  if (eventQuery.isLoading) {
    return (
      <div className="mx-auto grid min-h-screen max-w-[1180px] gap-6 px-4 py-8 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Skeleton className="h-[520px] w-full rounded-[32px]" />
        <Skeleton className="h-[720px] w-full rounded-[32px]" />
      </div>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Event not found</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">The backend could not resolve this public event link.</p>
        </Card>
      </div>
    );
  }

  const event = eventQuery.data;

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-6 sm:py-8">
      <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit p-8">
          <div className="mb-6 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]">
            {event.duration} min
          </div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">{event.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {event.description || "Choose a time that works and complete the booking details."}
          </p>

          <div className="mt-8 grid gap-5 text-sm text-[var(--muted)]">
            <div>
              <p className="font-semibold text-[var(--foreground)]">Host</p>
              <p className="mt-1">{event.hosts.map((host) => host.name).join(", ")}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">Scheduling type</p>
              <p className="mt-1">{event.schedulingType}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">Location</p>
              <p className="mt-1">
                {event.locations.length
                  ? event.locations.map((item) => item.type).join(", ")
                  : "To be shared after booking"}
              </p>
            </div>
            {event.paymentEnabled ? (
              <div>
                <p className="font-semibold text-[var(--foreground)]">Price</p>
                <p className="mt-1">
                  {event.price} {event.currency.toUpperCase()}
                </p>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="overflow-hidden p-0">
            <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="border-b border-[var(--border)] bg-[var(--panel-muted)] p-4 xl:border-r xl:border-b-0 xl:p-5">
                <BookingCalendar
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                />
              </div>

              <div className="p-6 sm:p-7">
                <div className="mb-5">
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {slotsQuery.data?.timezone ?? "Loading timezone..."}
                  </p>
                </div>

                <div className="max-h-[420px] overflow-y-auto pr-1">
                  {slotsQuery.isLoading ? (
                    <Skeleton className="h-72 w-full rounded-3xl" />
                  ) : (
                    <TimeSlotList
                      slots={slotsQuery.data?.slots ?? []}
                      selectedStartTime={selectedSlot?.startTime}
                      onSelect={setSelectedSlot}
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Enter details</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Confirm your contact information and complete the booking form.
              </p>
            </div>

            <form
              className="grid gap-5"
              onSubmit={(eventSubmit) => {
                eventSubmit.preventDefault();
                if (!selectedSlotStillAvailable) {
                  return;
                }
                bookingMutation.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">Name</span>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">Email</span>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">Timezone</span>
                  <Input
                    value={form.timezone}
                    onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">Language</span>
                  <Select
                    value={form.language}
                    onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                  >
                    <option value="en">English</option>
                    <option value="en-IN">English (India)</option>
                    <option value="hi">Hindi</option>
                  </Select>
                </label>
              </div>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">Guests</span>
                <Input
                  value={guestInput}
                  onChange={(event) => setGuestInput(event.target.value)}
                  placeholder="guest1@example.com, guest2@example.com"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">Notes</span>
                <Textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>

              {event.bookingFields.length
                ? event.bookingFields.map((field) => (
                    <label key={field.id} className="grid gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">{field.label}</span>
                      {field.type === "textarea" ? (
                        <Textarea
                          required={field.required}
                          placeholder={field.placeholder}
                          value={String(form.responses[field.id] ?? "")}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              responses: { ...current.responses, [field.id]: event.target.value }
                            }))
                          }
                        />
                      ) : field.type === "select" ? (
                        <Select
                          required={field.required}
                          value={String(form.responses[field.id] ?? "")}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              responses: { ...current.responses, [field.id]: event.target.value }
                            }))
                          }
                        >
                          <option value="">Select an option</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          required={field.required}
                          placeholder={field.placeholder}
                          value={String(form.responses[field.id] ?? "")}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              responses: { ...current.responses, [field.id]: event.target.value }
                            }))
                          }
                        />
                      )}
                    </label>
                  ))
                : null}

              {!selectedSlot ? (
                <p className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
                  Choose an available time before submitting your booking.
                </p>
              ) : null}

              {slotsQuery.isError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  We could not refresh availability right now. Please try again in a moment.
                </p>
              ) : null}

              {bookingMutation.isError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bookingMutation.error instanceof HttpError
                    ? bookingMutation.error.message
                    : "Booking failed. Please refresh availability and try again."}
                </p>
              ) : null}

              {bookingMutation.isSuccess ? (
                <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  <p>
                    {bookingMutation.data.status === "PENDING"
                      ? `Request submitted for ${format(new Date(bookingMutation.data.start), "PPP p")}. The host still needs to confirm it.`
                      : `Booking confirmed for ${format(new Date(bookingMutation.data.start), "PPP p")}.`}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/booking/manage/${bookingMutation.data.cancelToken ?? bookingMutation.data.uid}`}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition-all duration-150 hover:border-[#7aa2ff] hover:bg-white"
                    >
                      Manage meeting
                    </Link>
                    <Link
                      href={`/booking/manage/${bookingMutation.data.cancelToken ?? bookingMutation.data.uid}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition-all duration-150 hover:bg-red-100"
                    >
                      Cancel meeting
                    </Link>
                  </div>
                </div>
              ) : null}

              <Button
                disabled={
                  !selectedSlot ||
                  !selectedSlotStillAvailable ||
                  bookingMutation.isPending ||
                  slotsQuery.isLoading
                }
                type="submit"
                className="rounded-2xl"
              >
                {bookingMutation.isPending ? "Confirming..." : selectedSlot ? `Book ${selectedSlot.label}` : "Select a time"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
