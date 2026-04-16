import type {
  ApiError,
  AvailabilityResponse,
  Booking,
  BookingListResponse,
  CreateBookingPayload,
  EventType,
  EventTypePayload,
  PublicEvent,
  PublicProfile,
  SlotsResponse
} from "@/lib/api/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

type RequestOptions = RequestInit & {
  idempotencyKey?: string;
};

class HttpError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(message: string, status: number, code = "REQUEST_FAILED", details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function parseJsonPayload<T>(text: string): T | ApiError | null {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T | ApiError;
  } catch {
    return null;
  }
}

function createIdempotencyKey(prefix: string) {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  return `${prefix}:${randomPart}`;
}

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  const payload = parseJsonPayload<T>(text);

  if (!response.ok) {
    const errorPayload = payload as ApiError | null;
    throw new HttpError(
      errorPayload?.error?.message ?? "Request failed",
      response.status,
      errorPayload?.error?.code,
      errorPayload?.error?.details ?? (payload ? undefined : { rawBody: text || null })
    );
  }

  return payload as T;
}

function unwrap<T>(value: T | { data: T }): T {
  if (value && typeof value === "object" && "data" in value) {
    return value.data;
  }

  return value as T;
}

export const api = {
  listEventTypes: async () => unwrap(await request<{ data: EventType[] }>("/event-types")),
  createEventType: async (payload: EventTypePayload) =>
    unwrap(await request<{ data: EventType }>("/event-types", { method: "POST", body: JSON.stringify(payload) })),
  updateEventType: async (id: number, payload: Partial<EventTypePayload>) =>
    unwrap(await request<{ data: EventType }>(`/event-types/${id}`, { method: "PATCH", body: JSON.stringify(payload) })),
  deleteEventType: async (id: number) =>
    unwrap(await request<{ data: EventType }>(`/event-types/${id}`, { method: "DELETE" })),
  getAvailability: async () => request<AvailabilityResponse>("/availability"),
  replaceAvailability: async (payload: AvailabilityResponse) =>
    request<AvailabilityResponse>("/availability", { method: "PUT", body: JSON.stringify(payload) }),
  getPublicProfile: async (username: string) =>
    unwrap(await request<{ data: PublicProfile }>(`/public/profile/${username}`)),
  getPublicEvent: async (username: string, slug: string) =>
    unwrap(await request<{ data: PublicEvent }>(`/public/event/${username}/${slug}`)),
  getSlots: async (eventTypeId: number, date: string) =>
    request<SlotsResponse>(`/slots?eventTypeId=${eventTypeId}&date=${date}`),
  createBooking: async (payload: CreateBookingPayload, idempotencyKey = createIdempotencyKey("booking")) =>
    unwrap(
      await request<{ data: Booking }>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
        idempotencyKey
      })
    ),
  listBookings: async (status: "upcoming" | "past" | "cancelled" | "pending", take = 20, skip = 0) =>
    request<BookingListResponse>(`/bookings?status=${status}&take=${take}&skip=${skip}`),
  getBooking: async (uid: string) => unwrap(await request<{ data: Booking }>(`/bookings/${uid}`)),
  getManagedBooking: async (token: string) =>
    unwrap(await request<{ data: Booking }>(`/public/bookings/${token}`)),
  cancelBooking: async (uid: string, cancellationReason?: string) =>
    unwrap(
      await request<{ data: Booking }>(`/bookings/${uid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED", cancellationReason: cancellationReason ?? null })
      })
    ),
  cancelManagedBooking: async (token: string, cancellationReason?: string) =>
    unwrap(
      await request<{ data: Booking }>(`/public/bookings/${token}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED", cancellationReason: cancellationReason ?? null })
      })
    ),
  confirmBooking: async (uid: string) =>
    unwrap(
      await request<{ data: Booking }>(`/bookings/${uid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACCEPTED" })
      })
    ),
  rescheduleBooking: async (
    uid: string,
    start: string,
    reschedulingReason?: string,
    idempotencyKey = createIdempotencyKey("booking-reschedule")
  ) =>
    unwrap(
      await request<{ data: Booking }>(`/bookings/${uid}/reschedules`, {
        method: "POST",
        body: JSON.stringify({ start, reschedulingReason: reschedulingReason ?? null }),
        idempotencyKey
      })
    ),
  rescheduleManagedBooking: async (
    token: string,
    start: string,
    reschedulingReason?: string,
    idempotencyKey = createIdempotencyKey("booking-reschedule")
  ) =>
    unwrap(
      await request<{ data: Booking }>(`/public/bookings/${token}/reschedules`, {
        method: "POST",
        body: JSON.stringify({ start, reschedulingReason: reschedulingReason ?? null }),
        idempotencyKey
      })
    ),
  addGuests: async (uid: string, guests: string[]) =>
    unwrap(
      await request<{ data: Booking }>(`/bookings/${uid}/attendees`, {
        method: "POST",
        body: JSON.stringify({ guests })
      })
    ),
  markBookingPaid: async (uid: string) =>
    unwrap(
      await request<{ data: Booking }>(`/bookings/${uid}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: "PAID" })
      })
    )
};

export { HttpError, createIdempotencyKey };
