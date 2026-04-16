"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookingCalendar } from "@/components/booking/calendar";
import { TimeSlotList } from "@/components/booking/time-slot-list";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeIcon,
  GridIcon,
  SettingsIcon,
  UsersIcon,
  VideoIcon
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { HttpError, api, createIdempotencyKey } from "@/lib/api/client";
import type { Slot } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

function createAvatarUrl(name: string, username: string) {
  const seed = encodeURIComponent(`${name}-${username}`);
  return `https://api.dicebear.com/9.x/glass/svg?seed=${seed}`;
}

function formatSelectedDate(date: Date) {
  return format(date, "EEE d");
}

function formatBookingDateTime(startTime: string, duration: number) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60_000);
  return {
    dateLabel: format(start, "EEEE, MMMM d, yyyy"),
    timeLabel: `${format(start, "p")} - ${format(end, "p")}`
  };
}

export function PublicBookingPage({ username, eventSlug }: { username: string; eventSlug: string }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [guestInput, setGuestInput] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);
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
      slotsQuery.data?.slots.some((slot) => slot.startTime === selectedSlot.startTime && slot.available)
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
      setBookingRequestKey(createIdempotencyKey("booking"));
      await queryClient.invalidateQueries({ queryKey: ["slots", eventQuery.data?.id, dateParam] });
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: ["slots", eventQuery.data?.id, dateParam] });
    }
  });

  useEffect(() => {
    if (!selectedSlot || selectedSlotStillAvailable || bookingMutation.isSuccess) {
      return;
    }

    setSelectedSlot(null);
  }, [bookingMutation.isSuccess, selectedSlot, selectedSlotStillAvailable]);

  if (eventQuery.isLoading) {
    return (
      <div className="mx-auto min-h-screen max-w-[1060px] px-4 py-16">
        <Skeleton className="ml-auto h-10 w-80 rounded-full" />
        <Skeleton className="mt-24 h-[500px] w-full rounded-[28px]" />
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
  const primaryHost = event.hosts[0] ?? { name: "Host", username };
  const avatarUrl = createAvatarUrl(primaryHost.name, primaryHost.username);
  const selectedSlotMeta = selectedSlot ? formatBookingDateTime(selectedSlot.startTime, event.duration) : null;
  const isConfirmStep = Boolean(selectedSlot);
  const locationLabel = event.locations.length ? event.locations.map((item) => item.type).join(", ") : "Cal Video";

  return (
    <div className="min-h-screen bg-[#0b0b0c] px-4 py-6 text-white sm:py-10">
      <div className="mx-auto max-w-[1140px]">
        <div className="mb-6">
          <BackButton fallbackHref={`/u/${username}`} label="Back" className="rounded-[12px] px-3 text-[#d5d9e1]" />
        </div>
        <div className="flex justify-end">
          <div className="flex items-center gap-4 rounded-full border border-[#2a2d33] bg-[#111214]/80 px-3 py-2 text-sm text-[#e5e7eb]">
            <button
              type="button"
              className="relative h-7 w-12 rounded-full bg-[#1f2125] transition"
              aria-label="Overlay my calendar"
            >
              <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white" />
            </button>
            <span>Overlay my calendar</span>
            <div className="flex items-center gap-2 text-[#cfd3db]">
              <button type="button" className="rounded-[10px] border border-[#2a2d33] p-2 hover:bg-[#181a1e]">
                <SettingsIcon className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-[10px] border border-[#2a2d33] p-2 hover:bg-[#181a1e]">
                <CalendarIcon className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-[10px] border border-[#2a2d33] p-2 hover:bg-[#181a1e]">
                <GridIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-[1040px]">
          <Card className="overflow-hidden border-[#2a2d33] bg-[#141415] shadow-[0_22px_90px_rgba(0,0,0,0.35)]">
            <div
              className={cn(
                "grid",
                isConfirmStep
                  ? "lg:grid-cols-[340px_minmax(0,1fr)]"
                  : "lg:grid-cols-[280px_minmax(0,1fr)_280px]"
              )}
            >
              <aside className="border-b border-[#2a2d33] p-6 sm:p-7 lg:border-r lg:border-b-0">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarUrl}
                    alt={`${primaryHost.name} avatar`}
                    className="h-8 w-8 rounded-full border border-[#2f3238] bg-[#1a1d22]"
                  />
                  <span className="text-[13px] font-semibold text-[#9fa5b0]">{primaryHost.name}</span>
                </div>

                <h1 className="mt-6 text-[1.05rem] font-semibold text-white sm:text-[1.15rem]">{event.title}</h1>

                {selectedSlotMeta ? (
                  <div className="mt-6 grid gap-4 text-[15px] text-[#f4f4f5]">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="mt-0.5 h-4.5 w-4.5 text-[#9fa5b0]" />
                      <div>
                        <p>{selectedSlotMeta.dateLabel}</p>
                        <p>{selectedSlotMeta.timeLabel}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-5 text-[15px] text-[#f4f4f5]">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-4.5 w-4.5 text-[#9fa5b0]" />
                    <span>{event.duration}m</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <VideoIcon className="h-4.5 w-4.5 text-[#9fa5b0]" />
                    <span>{locationLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <GlobeIcon className="h-4.5 w-4.5 text-[#9fa5b0]" />
                    <span>{slotsQuery.data?.timezone ?? form.timezone}</span>
                  </div>
                </div>

                {event.description ? (
                  <p className="mt-7 max-w-[24ch] text-sm leading-6 text-[#8d93a0]">{event.description}</p>
                ) : null}
              </aside>

              {isConfirmStep ? (
                <section className="p-6 sm:p-7">
                  <form
                    className="grid gap-5"
                    onSubmit={(eventSubmit) => {
                      eventSubmit.preventDefault();
                      if (!selectedSlotStillAvailable || bookingMutation.isSuccess) {
                        return;
                      }
                      bookingMutation.mutate();
                    }}
                  >
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-white">Your name *</span>
                      <Input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className="h-12 rounded-[14px] border-[#363b43] bg-[#111214]"
                        required
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-white">Email address *</span>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        className="h-12 rounded-[14px] border-[#363b43] bg-[#111214]"
                        required
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-white">Additional notes</span>
                      <Textarea
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Please share anything that will help prepare for our meeting."
                        className="min-h-20 rounded-[14px] border-[#363b43] bg-[#111214]"
                      />
                    </label>

                    <div className="pt-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#d6dae2] hover:text-white"
                        onClick={() => setShowGuestInput((current) => !current)}
                      >
                        <UsersIcon className="h-4 w-4" />
                        Add guests
                      </button>
                    </div>

                    {showGuestInput ? (
                      <label className="grid gap-2 text-sm">
                        <span className="font-semibold text-white">Guest emails</span>
                        <Input
                          value={guestInput}
                          onChange={(event) => setGuestInput(event.target.value)}
                          placeholder="guest1@example.com, guest2@example.com"
                          className="h-12 rounded-[14px] border-[#363b43] bg-[#111214]"
                        />
                      </label>
                    ) : null}

                    {event.bookingFields.length
                      ? event.bookingFields.map((field) => (
                          <label key={field.id} className="grid gap-2 text-sm">
                            <span className="font-semibold text-white">{field.label}{field.required ? " *" : ""}</span>
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
                                className="min-h-20 rounded-[14px] border-[#363b43] bg-[#111214]"
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
                                className="h-12 rounded-[14px] border-[#363b43] bg-[#111214]"
                              >
                                <option value="">Select an option</option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </Select>
                            ) : field.type === "checkbox" ? (
                              <label className="flex items-center gap-3 rounded-[14px] border border-[#363b43] bg-[#111214] px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={Boolean(form.responses[field.id] ?? false)}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      responses: { ...current.responses, [field.id]: event.target.checked }
                                    }))
                                  }
                                />
                                <span className="text-sm text-[#dfe3ea]">{field.placeholder ?? field.label}</span>
                              </label>
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
                                className="h-12 rounded-[14px] border-[#363b43] bg-[#111214]"
                              />
                            )}
                          </label>
                        ))
                      : null}

                    {bookingMutation.isError ? (
                      <p className="rounded-[14px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {bookingMutation.error instanceof HttpError
                          ? bookingMutation.error.message
                          : "Booking failed. Please refresh availability and try again."}
                      </p>
                    ) : null}

                    {!selectedSlotStillAvailable && !bookingMutation.isSuccess ? (
                      <p className="rounded-[14px] border border-[#373c44] bg-[#17191d] px-4 py-3 text-sm text-[#b9c0cc]">
                        This time is no longer available. Go back and choose another slot.
                      </p>
                    ) : null}

                    {bookingMutation.isSuccess ? (
                      <div className="grid gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                        <div className="flex items-center gap-2 font-medium">
                          <CheckCircleIcon className="h-4.5 w-4.5" />
                          {bookingMutation.data.status === "PENDING" ? "Request sent" : "Booking confirmed"}
                        </div>
                        <p>
                          {bookingMutation.data.status === "PENDING"
                            ? `Request submitted for ${format(new Date(bookingMutation.data.start), "PPP p")}. The host still needs to confirm it.`
                            : `Booking confirmed for ${format(new Date(bookingMutation.data.start), "PPP p")}.`}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/booking/manage/${bookingMutation.data.cancelToken ?? bookingMutation.data.uid}`}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
                          >
                            Manage meeting
                          </Link>
                          <Link
                            href={`/booking/manage/${bookingMutation.data.cancelToken ?? bookingMutation.data.uid}`}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-[#093b2e] transition hover:bg-white"
                          >
                            Open booking
                          </Link>
                        </div>
                      </div>
                    ) : null}

                    <p className="pt-2 text-sm leading-6 text-[#9096a3]">
                      By proceeding, you agree to Cal.com&apos;s Terms and Privacy Policy.
                    </p>

                    <div className="flex items-center justify-end gap-3">
                      <Button
                        type="button"
                        variant="dark"
                        className="h-11 rounded-[14px] border-[#2d3138] bg-[#23252a] px-5"
                        onClick={() => {
                          setSelectedSlot(null);
                          setBookingRequestKey(createIdempotencyKey("booking"));
                          bookingMutation.reset();
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        disabled={!selectedSlotStillAvailable || bookingMutation.isPending || bookingMutation.isSuccess}
                        type="submit"
                        className="h-11 rounded-[14px] px-5"
                      >
                        {bookingMutation.isPending ? "Confirming..." : "Confirm"}
                      </Button>
                    </div>
                  </form>
                </section>
              ) : (
                <>
                  <section className="border-b border-[#2a2d33] p-6 sm:p-7 lg:border-r lg:border-b-0">
                    <BookingCalendar
                      value={selectedDate}
                      onChange={(date) => {
                        setSelectedDate(date);
                        setSelectedSlot(null);
                        bookingMutation.reset();
                      }}
                    />
                  </section>

                  <section className="p-6 sm:p-5">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[1.1rem] font-semibold text-white">{formatSelectedDate(selectedDate)}</p>
                      </div>
                      <div className="inline-flex rounded-[12px] border border-[#2a2d33] bg-[#17191d] p-1 text-sm">
                        <span className="rounded-[9px] bg-[#111214] px-2.5 py-1 font-semibold text-white">12h</span>
                        <span className="px-2.5 py-1 font-semibold text-[#8f949d]">24h</span>
                      </div>
                    </div>

                    <div className="max-h-[460px] overflow-y-auto pr-1">
                      {slotsQuery.isLoading ? (
                        <Skeleton className="h-80 w-full rounded-[24px]" />
                      ) : (
                        <TimeSlotList
                          slots={slotsQuery.data?.slots ?? []}
                          selectedStartTime={selectedSlot?.startTime}
                          onSelect={(slot) => {
                            setSelectedSlot(slot);
                            bookingMutation.reset();
                          }}
                        />
                      )}
                    </div>

                    {slotsQuery.isError ? (
                      <p className="mt-4 rounded-[14px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        We could not refresh availability right now. Please try again in a moment.
                      </p>
                    ) : null}
                  </section>
                </>
              )}
            </div>
          </Card>

          <div className="mt-8 text-center text-[2rem] font-semibold tracking-[-0.05em] text-white/90">Cal.com</div>
        </div>
      </div>
    </div>
  );
}
