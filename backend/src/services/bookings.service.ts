import { Prisma } from "@prisma/client";
import { addMinutesUtc, formatDateInTimezone } from "../utils/dateHelpers.js";
import { prisma } from "../prisma/client.js";
import type { BookingPaymentStatus, BookingStatus } from "../types/enums.js";
import { AppError } from "../utils/appError.js";
import { getSlotsForDate } from "./slotGenerator.service.js";
import { sendBookingConfirmationEmail } from "./email.service.js";
import { env } from "../config/env.js";

type CreateBookingInput = {
  eventTypeId: number;
  start?: string;
  startTime?: string;
  attendee?: {
    name: string;
    email: string;
    timeZone: string;
    language?: string;
  };
  bookerName?: string;
  bookerEmail?: string;
  timeZone?: string;
  language?: string;
  guests?: string[];
  location?: string | null;
  notes?: string | null;
  responses?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
};

type BookingListStatus = "upcoming" | "past" | "cancelled" | "pending";

type BookingListOptions = {
  take: number;
  skip: number;
  eventTypeId?: number;
  attendeeEmail?: string;
  afterStart?: string;
  beforeStart?: string;
  sortStart?: "asc" | "desc";
};

type CreateBookingOptions = {
  fromRescheduleUid?: string | null;
  idempotencyKey?: string | null;
  excludeBookingId?: number;
};

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["PENDING", "ACCEPTED"];
const INDIVIDUAL_SCHEDULING_TYPES = new Set(["INDIVIDUAL", "ONE_ON_ONE"]);

const bookingInclude = {
  eventType: {
    include: {
      user: {
        select: { id: true, name: true, email: true, timezone: true }
      }
    }
  },
  assignedHost: {
    select: { id: true, name: true, email: true, timezone: true }
  },
  attendees: {
    orderBy: [{ isPrimary: "desc" as const }, { id: "asc" as const }]
  },
  references: {
    orderBy: { id: "asc" as const }
  }
};

const bookingListSelect = {
  id: true,
  uid: true,
  cancelToken: true,
  idempotencyKey: true,
  bookerName: true,
  bookerEmail: true,
  startTime: true,
  endTime: true,
  status: true,
  paymentStatus: true,
  notes: true,
  rescheduled: true,
  fromRescheduleUid: true,
  location: true,
  noShowHost: true,
  cancellationReason: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  eventType: {
    select: {
      id: true,
      slug: true,
      title: true,
      duration: true
    }
  },
  assignedHost: {
    select: { id: true, name: true, email: true, timezone: true }
  },
  attendees: {
    select: {
      name: true,
      email: true,
      timeZone: true,
      language: true,
      isPrimary: true
    },
    orderBy: [{ isPrimary: "desc" as const }, { id: "asc" as const }]
  },
  references: {
    select: {
      id: true,
      type: true,
      uid: true,
      meetingId: true,
      meetingUrl: true,
      externalCalendarId: true,
      deleted: true
    },
    where: {
      deleted: false
    },
    orderBy: { id: "asc" as const },
    take: 1
  }
};

type BookingRecord = any;

const TX_MAX_WAIT_MS = 10_000;
const TX_TIMEOUT_MS = 20_000;
const prismaSql = Prisma as any;
type BookingExecutor = any;
type HostRecord = { id: number; name: string; email: string; timezone: string };
type AttendeeRecord = {
  name: string;
  email: string;
  timeZone: string;
  language?: string | null;
  isPrimary: boolean;
};
type ReferenceRecord = {
  id: number;
  type: string;
  uid: string;
  meetingId?: string | null;
  meetingUrl?: string | null;
  externalCalendarId?: string | null;
  deleted?: boolean | null;
};

type NotificationMetadata = {
  bookingConfirmationEmailSentAt?: string;
  bookingConfirmationEmailMessageId?: string | null;
};

function getAttendee(input: CreateBookingInput) {
  if (input.attendee) {
    return {
      name: input.attendee.name,
      email: input.attendee.email,
      timeZone: input.attendee.timeZone,
      language: input.attendee.language ?? input.language ?? "en"
    };
  }

  return {
    name: input.bookerName ?? "",
    email: input.bookerEmail ?? "",
    timeZone: input.timeZone ?? "UTC",
    language: input.language ?? "en"
  };
}

function getRequestedStart(input: CreateBookingInput) {
  return new Date(input.start ?? input.startTime ?? "");
}

function inferLocation(eventType: { locations: unknown }) {
  if (!Array.isArray(eventType.locations) || !eventType.locations.length) {
    return null;
  }

  const first = eventType.locations[0];
  if (first && typeof first === "object" && "type" in first) {
    return String(first.type);
  }

  return null;
}

function buildMeetingUrl(uid: string, location: string | null) {
  if (!location) return null;
  if (location.includes("zoom")) return `https://zoom.us/j/${uid}`;
  if (location.includes("google")) return `https://meet.google.com/${uid.slice(0, 3)}-${uid.slice(3, 7)}-${uid.slice(7, 10)}`;
  if (location.includes("daily") || location.includes("cal-video")) return `https://calclone.daily.co/${uid}`;
  return null;
}

function toPlainObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getPrimaryAttendee(booking: BookingRecord): AttendeeRecord | null {
  const attendeeRows = Array.isArray(booking.attendees) ? booking.attendees : [];

  return attendeeRows.find((attendee: AttendeeRecord) => attendee.isPrimary) ?? attendeeRows[0] ?? null;
}

function getPrimaryHost(booking: BookingRecord): HostRecord | null {
  return (booking.assignedHost ?? booking.eventType.user) as HostRecord | null;
}

function getPrimaryReference(booking: BookingRecord): ReferenceRecord | null {
  const referenceRows = Array.isArray(booking.references) ? booking.references : [];

  return (
    referenceRows.find((reference: ReferenceRecord) => Boolean(reference.meetingUrl)) ??
    referenceRows[0] ??
    null
  );
}

function getNotificationMetadata(metadata: Record<string, unknown>): NotificationMetadata {
  const notifications = toPlainObject(metadata.notifications);

  return {
    bookingConfirmationEmailSentAt:
      typeof notifications.bookingConfirmationEmailSentAt === "string"
        ? notifications.bookingConfirmationEmailSentAt
        : undefined,
    bookingConfirmationEmailMessageId:
      typeof notifications.bookingConfirmationEmailMessageId === "string" ||
      notifications.bookingConfirmationEmailMessageId === null
        ? (notifications.bookingConfirmationEmailMessageId as string | null)
        : undefined
  };
}

async function markBookingConfirmationEmailSent(
  booking: BookingRecord,
  messageId?: string | null
) {
  const metadata = toPlainObject(booking.metadata);
  const notifications = toPlainObject(metadata.notifications);

  return prisma.booking.update({
    where: { id: booking.id },
    data: {
      metadata: {
        ...metadata,
        notifications: {
          ...notifications,
          bookingConfirmationEmailSentAt: new Date().toISOString(),
          bookingConfirmationEmailMessageId: messageId ?? null
        }
      }
    },
    include: bookingInclude
  });
}

async function sendBookingConfirmationEmailIfNeeded(booking: BookingRecord) {
  const metadata = toPlainObject(booking.metadata);
  const notificationMetadata = getNotificationMetadata(metadata);

  if (notificationMetadata.bookingConfirmationEmailSentAt) {
    return booking;
  }

  const attendee = getPrimaryAttendee(booking);
  const host = getPrimaryHost(booking);
  const reference = getPrimaryReference(booking);

  if (!attendee?.email) {
    logBookingDebug("Skipping booking confirmation email because no recipient was found.", {
      bookingId: booking.id,
      bookingUid: booking.uid
    });
    return booking;
  }

  try {
    const result = await sendBookingConfirmationEmail({
      bookingId: booking.id,
      bookingUid: booking.uid,
      attendeeName: attendee.name,
      attendeeEmail: attendee.email,
      eventName: booking.eventType.title,
      startTimeIso: booking.startTime.toISOString(),
      endTimeIso: booking.endTime.toISOString(),
      timezone: attendee.timeZone || booking.eventType.timeZone || host?.timezone || "UTC",
      location: booking.location,
      meetingUrl: reference?.meetingUrl ?? null,
      manageUrl: booking.cancelToken ? `${env.FRONTEND_URL}/booking/manage/${booking.cancelToken}` : null,
      supportEmail: env.SUPPORT_EMAIL,
      brandName: env.APP_NAME
    });

    if (result.status === "skipped") {
      logBookingDebug("Skipping booking confirmation email.", {
        bookingId: booking.id,
        bookingUid: booking.uid,
        reason: result.reason
      });
      return booking;
    }

    return markBookingConfirmationEmailSent(booking, result.messageId);
  } catch (error) {
    logBookingError("Booking confirmation email failed.", error, {
      bookingId: booking.id,
      bookingUid: booking.uid,
      attendeeEmail: attendee.email
    });
    return booking;
  }
}

function validateRequiredBookingFields(
  bookingFields: unknown,
  responses: Record<string, unknown>
) {
  if (!Array.isArray(bookingFields)) return;

  for (const field of bookingFields) {
    if (!field || typeof field !== "object") continue;
    const fieldId = "id" in field ? String(field.id) : "";
    const required = "required" in field ? Boolean(field.required) : false;

    if (!fieldId || !required) continue;

    const value = responses[fieldId];
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    const isEmptyString = typeof value === "string" && value.trim().length === 0;

    if (value === undefined || value === null || isEmptyArray || isEmptyString) {
      throw new AppError("VALIDATION_ERROR", `Missing required booking field: ${fieldId}`, 400);
    }
  }
}

function assertSupportedSchedulingType(schedulingType: string) {
  if (!INDIVIDUAL_SCHEDULING_TYPES.has(schedulingType)) {
    throw new AppError(
      "SCHEDULING_TYPE_NOT_SUPPORTED",
      "Scheduling type not supported.",
      400
    );
  }
}

function assertAllowedTransition(
  currentStatus: BookingStatus,
  allowedStatuses: BookingStatus[],
  action: string
) {
  if (allowedStatuses.includes(currentStatus)) {
    return;
  }

  throw new AppError(
    "INVALID_BOOKING_TRANSITION",
    `Cannot ${action} a booking while it is ${currentStatus}.`,
    409
  );
}

function resolveInitialLifecycle(eventType: { paymentEnabled: boolean; requiresConfirmation: boolean }) {
  if (eventType.paymentEnabled) {
    return {
      status: "PENDING" as BookingStatus,
      paymentStatus: "REQUIRED" as BookingPaymentStatus
    };
  }

  return {
    status: (eventType.requiresConfirmation ? "PENDING" : "ACCEPTED") as BookingStatus,
    paymentStatus: "NOT_REQUIRED" as BookingPaymentStatus
  };
}

function logBookingDebug(message: string, payload: Record<string, unknown>) {
  console.info(`[bookings] ${message}`, payload);
}

function logBookingError(message: string, error: unknown, payload: Record<string, unknown>) {
  console.error(`[bookings] ${message}`, {
    ...payload,
    error
  });
}

async function getBookingRecordOrThrow(uid: string, db: BookingExecutor = prisma) {
  const booking =
    (await db.booking.findUnique({
      where: { uid },
      include: bookingInclude
    })) ??
    (await db.booking.findUnique({
      where: { cancelToken: uid },
      include: bookingInclude
    }));

  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found.", 404);
  }

  return booking;
}

async function getBookingByIdempotencyKey(
  idempotencyKey: string,
  db: BookingExecutor = prisma
) {
  return db.booking.findUnique({
    where: { idempotencyKey },
    include: bookingInclude
  });
}

async function assertNoOverlappingBookings(input: {
  db: BookingExecutor;
  assignedHostId: number | null;
  eventTypeId: number;
  requestedStart: Date;
  requestedEnd: Date;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  excludeBookingId?: number;
  statuses?: BookingStatus[];
}) {
  const requestedBlockStart = addMinutesUtc(input.requestedStart, -input.beforeEventBuffer);
  const requestedBlockEnd = addMinutesUtc(input.requestedEnd, input.afterEventBuffer);
  const hostScope = input.assignedHostId
    ? prismaSql.sql`b."assignedHostId" = ${input.assignedHostId}`
    : prismaSql.sql`b."eventTypeId" = ${input.eventTypeId}`;
  const excludeClause =
    input.excludeBookingId !== undefined
      ? prismaSql.sql`AND b."id" <> ${input.excludeBookingId}`
      : prismaSql.empty;
  const statuses = input.statuses ?? ACTIVE_BOOKING_STATUSES;
  const statusValues = prismaSql.join(
    statuses.map((status) => prismaSql.sql`${status}::"BookingStatus"`)
  );

  const conflicts = (await input.db.$queryRaw(prismaSql.sql`
    SELECT b."id"
    FROM "bookings" b
    INNER JOIN "event_types" et ON et."id" = b."eventTypeId"
    WHERE b."status" IN (${statusValues})
      AND ${hostScope}
      ${excludeClause}
      AND (b."startTime" - make_interval(mins => COALESCE(et."beforeEventBuffer", 0))) < ${requestedBlockEnd}
      AND (b."endTime" + make_interval(mins => COALESCE(et."afterEventBuffer", 0))) > ${requestedBlockStart}
    LIMIT 1
  `)) as Array<{ id: number }>;

  if (conflicts.length > 0) {
    throw new AppError(
      "BOOKING_CONFLICT",
      "This slot is no longer available. Please choose another time.",
      409
    );
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function isSerializationError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
}

async function createBookingRecord(
  input: CreateBookingInput,
  db: BookingExecutor = prisma,
  options?: CreateBookingOptions
) {
  const requestedStart = getRequestedStart(input);
  const attendee = getAttendee(input);

  if (Number.isNaN(requestedStart.getTime())) {
    throw new AppError("VALIDATION_ERROR", "Use a valid ISO datetime for start.", 400);
  }

  const eventType = await db.eventType.findFirst({
    where: { id: input.eventTypeId, isActive: true },
    include: {
      user: true,
      hosts: {
        include: {
          user: true
        }
      }
    }
  });

  if (!eventType) {
    throw new AppError("EVENT_TYPE_NOT_FOUND", "Event type not found.", 404);
  }

  assertSupportedSchedulingType(eventType.schedulingType);

  const availableHosts = [
    ...(eventType.user ? [eventType.user] : []),
    ...eventType.hosts.map((host: any) => host.user)
  ];

  const primaryHost = availableHosts[0] ?? null;

  if (!primaryHost) {
    throw new AppError("HOST_NOT_FOUND", "This event type does not have an active host.", 400);
  }

  const bookingTimezone = eventType.timeZone ?? primaryHost.timezone;
  const slotDate = formatDateInTimezone(requestedStart, bookingTimezone);
  const availability = await getSlotsForDate(eventType.id, slotDate, db);
  const requestedSlot = availability.slots.find(
    (slot) => new Date(slot.startTime).getTime() === requestedStart.getTime()
  );

  if (!requestedSlot || !requestedSlot.available) {
    throw new AppError(
      "BOOKING_CONFLICT",
      "This slot is no longer available. Please choose another time.",
      409
    );
  }

  const location = input.location ?? inferLocation(eventType);
  const endTime = addMinutesUtc(requestedStart, eventType.duration);
  const lifecycle = resolveInitialLifecycle(eventType);
  const metadata = toPlainObject(input.metadata ?? {});
  const responses = input.responses ?? {};
  const assignedHostId = primaryHost.id;

  validateRequiredBookingFields(eventType.bookingFields, responses);

  await assertNoOverlappingBookings({
    db,
    assignedHostId,
    eventTypeId: eventType.id,
    requestedStart,
    requestedEnd: endTime,
    beforeEventBuffer: eventType.beforeEventBuffer,
    afterEventBuffer: eventType.afterEventBuffer,
    excludeBookingId: options?.excludeBookingId
  });

  const booking = await db.booking.create({
    data: {
      eventTypeId: eventType.id,
      assignedHostId,
      idempotencyKey: options?.idempotencyKey ?? null,
      bookerName: attendee.name,
      bookerEmail: attendee.email,
      startTime: requestedStart,
      endTime,
      notes: input.notes ?? null,
      status: lifecycle.status,
      paymentStatus: lifecycle.paymentStatus,
      rescheduled: Boolean(options?.fromRescheduleUid),
      fromRescheduleUid: options?.fromRescheduleUid ?? null,
      responses,
      metadata: {
        ...metadata,
        source: metadata.source ?? "public_booking_page"
      },
      location,
      attendees: {
        create: [
          {
            email: attendee.email,
            name: attendee.name,
            timeZone: attendee.timeZone,
            language: attendee.language,
            isPrimary: true
          },
          ...(input.guests ?? []).map((guest) => ({
            email: guest,
            name: guest.split("@")[0],
            timeZone: attendee.timeZone,
            language: attendee.language,
            isPrimary: false
          }))
        ]
      }
    },
    include: bookingInclude
  });

  const meetingUrl = buildMeetingUrl(booking.uid, location);

  if (meetingUrl || location) {
    return db.booking.update({
      where: { id: booking.id },
      data: {
        references: {
          create: {
            type: location ?? "booking",
            uid: `${booking.uid}:${location ?? "booking"}`,
            meetingUrl,
            meetingId: meetingUrl ? booking.uid : null
          }
        }
      },
      include: bookingInclude
    });
  }

  return booking;
}

function mapBookingResponse(booking: BookingRecord) {
  const metadata = toPlainObject(booking.metadata);
  const responses = toPlainObject(booking.responses);
  const attendeeRows = Array.isArray(booking.attendees) ? booking.attendees : [];
  const referenceRows = Array.isArray(booking.references) ? booking.references : [];
  const attendees = attendeeRows.map((attendee: AttendeeRecord) => ({
    name: attendee.name,
    email: attendee.email,
    timeZone: attendee.timeZone,
    language: attendee.language ?? "en"
  }));
  const primaryAttendee = getPrimaryAttendee(booking);
  const guests = attendeeRows
    .filter((attendee: AttendeeRecord) => !attendee.isPrimary)
    .map((attendee: AttendeeRecord) => attendee.email);
  const host = getPrimaryHost(booking);
  const primaryReference = getPrimaryReference(booking);

  return {
    id: booking.id,
    uid: booking.uid,
    cancelToken: booking.cancelToken,
    idempotencyKey: booking.idempotencyKey,
    title: `${booking.eventType.title} between ${host?.name ?? "Host"} and ${primaryAttendee?.name ?? booking.bookerName}`,
    description: booking.notes,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    start: booking.startTime.toISOString(),
    end: booking.endTime.toISOString(),
    duration: booking.eventType.duration,
    location: booking.location,
    videoCallUrl: primaryReference?.meetingUrl ?? null,
    meetingUrl: primaryReference?.meetingUrl ?? null,
    hosts: host
      ? [
          {
            id: host.id,
            name: host.name,
            email: host.email,
            timeZone: host.timezone
          }
        ]
      : [],
    attendee: primaryAttendee
      ? {
          name: primaryAttendee.name,
          email: primaryAttendee.email,
          timeZone: primaryAttendee.timeZone,
          language: primaryAttendee.language ?? "en"
        }
      : null,
    attendees,
    guests,
    eventType: {
      id: booking.eventType.id,
      slug: booking.eventType.slug,
      title: booking.eventType.title
    },
    responses,
    metadata,
    cancellationReason: booking.cancellationReason,
    rejectionReason: booking.rejectionReason,
    rescheduled: booking.rescheduled,
    fromRescheduleUid: booking.fromRescheduleUid,
    absentHost: booking.noShowHost,
    references: referenceRows.map((reference: ReferenceRecord) => ({
      id: reference.id,
      type: reference.type,
      uid: reference.uid,
      meetingId: reference.meetingId,
      meetingUrl: reference.meetingUrl,
      externalCalendarId: reference.externalCalendarId,
      deleted: reference.deleted
    })),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString()
  };
}

export async function createBooking(input: CreateBookingInput) {
  try {
    const booking = await prisma.$transaction(
      async (tx: BookingExecutor) => {
        if (input.idempotencyKey) {
          const existing = await getBookingByIdempotencyKey(input.idempotencyKey, tx);
          if (existing) {
            return existing;
          }
        }

        return createBookingRecord(input, tx, {
          idempotencyKey: input.idempotencyKey ?? null
        });
      },
      {
        isolationLevel: "Serializable",
        maxWait: TX_MAX_WAIT_MS,
        timeout: TX_TIMEOUT_MS
      }
    );

    const bookingWithNotificationStatus = await sendBookingConfirmationEmailIfNeeded(booking);
    return mapBookingResponse(bookingWithNotificationStatus);
  } catch (error) {
    if (input.idempotencyKey && isUniqueConstraintError(error)) {
      const existing = await getBookingByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        const bookingWithNotificationStatus = await sendBookingConfirmationEmailIfNeeded(existing);
        return mapBookingResponse(bookingWithNotificationStatus);
      }
    }

    if (isUniqueConstraintError(error) || isSerializationError(error)) {
      throw new AppError(
        "BOOKING_CONFLICT",
        "This slot is no longer available. Please choose another time.",
        409
      );
    }

    throw error;
  }
}

export async function listBookings(status: BookingListStatus, options: BookingListOptions) {
  const now = new Date();
  const where: Record<string, unknown> = {};

  if (status === "cancelled") {
    where.status = "CANCELLED";
  } else if (status === "pending") {
    where.status = "PENDING";
  } else if (status === "past") {
    where.startTime = { lt: now };
    where.status = { in: ["ACCEPTED", "PENDING", "REJECTED"] };
  } else {
    where.startTime = { gte: now };
    where.status = { in: ["ACCEPTED"] };
  }

  if (options.eventTypeId) {
    where.eventTypeId = options.eventTypeId;
  }

  if (options.attendeeEmail) {
    where.attendees = {
      some: {
        email: {
          equals: options.attendeeEmail,
          mode: "insensitive"
        }
      }
    };
  }

  if (options.afterStart || options.beforeStart) {
    where.startTime = {
      ...(where.startTime && typeof where.startTime === "object" ? where.startTime : {}),
      ...(options.afterStart ? { gte: new Date(options.afterStart) } : {}),
      ...(options.beforeStart ? { lte: new Date(options.beforeStart) } : {})
    };
  }

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: {
        startTime: options.sortStart ?? (status === "past" || status === "cancelled" ? "desc" : "asc")
      },
      select: bookingListSelect
    })
  ]);

  return {
    status: "success" as const,
    data: bookings.map((booking: BookingRecord) => mapBookingResponse(booking)),
    meta: {
      total,
      take: options.take,
      skip: options.skip,
      hasMore: options.skip + bookings.length < total
    }
  };
}

export async function getBookingByUid(uid: string) {
  return mapBookingResponse(await getBookingRecordOrThrow(uid));
}

export async function cancelBooking(uid: string, cancellationReason?: string | null) {
  logBookingDebug("cancelBooking:start", { uid, cancellationReason: cancellationReason ?? null });

  try {
    const updated = await prisma.$transaction(
      async (tx: BookingExecutor) => {
        const booking = await getBookingRecordOrThrow(uid, tx);
        logBookingDebug("cancelBooking:beforeUpdate", {
          uid,
          bookingId: booking.id,
          status: booking.status
        });

        assertAllowedTransition(booking.status, ["PENDING", "ACCEPTED"], "cancel");

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            cancellationReason: cancellationReason ?? booking.cancellationReason ?? null,
            references: {
              updateMany: {
                where: { deleted: false },
                data: { deleted: true }
              }
            }
          }
        });

        const refreshed = await tx.booking.findUnique({
          where: { id: booking.id },
          include: bookingInclude
        });

        if (!refreshed) {
          throw new AppError("BOOKING_NOT_FOUND", "Booking not found after cancellation.", 404);
        }

        logBookingDebug("cancelBooking:afterUpdate", {
          uid,
          bookingId: refreshed.id,
          status: refreshed.status
        });

        return refreshed;
      },
      {
        maxWait: TX_MAX_WAIT_MS,
        timeout: TX_TIMEOUT_MS
      }
    );

    return mapBookingResponse(updated);
  } catch (error) {
    logBookingError("cancelBooking:failed", error, {
      uid,
      cancellationReason: cancellationReason ?? null
    });
    throw error;
  }
}

export async function confirmBooking(uid: string) {
  try {
    return await prisma.$transaction(
      async (tx: BookingExecutor) => {
        const booking = await getBookingRecordOrThrow(uid, tx);
        assertAllowedTransition(booking.status, ["PENDING"], "confirm");

        if (booking.paymentStatus === "REQUIRED") {
          throw new AppError(
            "PAYMENT_REQUIRED",
            "This booking must be marked as paid before it can be accepted.",
            409
          );
        }

        await assertNoOverlappingBookings({
          db: tx,
          assignedHostId: booking.assignedHostId,
          eventTypeId: booking.eventTypeId,
          requestedStart: booking.startTime,
          requestedEnd: booking.endTime,
          beforeEventBuffer: booking.eventType.beforeEventBuffer,
          afterEventBuffer: booking.eventType.afterEventBuffer,
          excludeBookingId: booking.id,
          statuses: ["ACCEPTED"]
        });

        const updated = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "ACCEPTED"
          },
          include: bookingInclude
        });

        await tx.booking.updateMany({
          where: {
            id: { not: booking.id },
            status: "PENDING",
            startTime: booking.startTime,
            endTime: booking.endTime,
            assignedHostId: booking.assignedHostId
          },
          data: {
            status: "REJECTED",
            rejectionReason: "Another pending booking for this slot was confirmed first."
          }
        });

        return mapBookingResponse(updated);
      },
      { isolationLevel: "Serializable" }
    );
  } catch (error) {
    if (isUniqueConstraintError(error) || isSerializationError(error)) {
      throw new AppError(
        "BOOKING_CONFLICT",
        "This slot is no longer available. Please choose another time.",
        409
      );
    }

    throw error;
  }
}

export async function addGuests(uid: string, guests: string[]) {
  const updated = await prisma.$transaction(async (tx: BookingExecutor) => {
    const booking = await getBookingRecordOrThrow(uid, tx);
    assertAllowedTransition(booking.status, ["ACCEPTED"], "add guests to");

    const existing = new Set(
      booking.attendees.map((attendee: AttendeeRecord) => attendee.email.toLowerCase())
    );
    const uniqueGuests = guests.filter((guest) => !existing.has(guest.toLowerCase()));

    if (!uniqueGuests.length) {
      return booking;
    }

    return tx.booking.update({
      where: { id: booking.id },
      data: {
        attendees: {
          create: uniqueGuests.map((guest) => ({
            email: guest,
            name: guest.split("@")[0],
            timeZone:
              booking.attendees.find((attendee: AttendeeRecord) => attendee.isPrimary)?.timeZone ??
              "UTC",
            language:
              booking.attendees.find((attendee: AttendeeRecord) => attendee.isPrimary)?.language ??
              "en",
            isPrimary: false
          }))
        }
      },
      include: bookingInclude
    });
  });

  return mapBookingResponse(updated);
}

export async function markAsPaid(uid: string) {
  const updated = await prisma.$transaction(async (tx: BookingExecutor) => {
    const booking = await getBookingRecordOrThrow(uid, tx);

    if (booking.paymentStatus !== "REQUIRED") {
      throw new AppError(
        "INVALID_PAYMENT_STATE",
        `Cannot mark booking as paid while payment status is ${booking.paymentStatus}.`,
        409
      );
    }

    assertAllowedTransition(booking.status, ["PENDING"], "mark as paid");

    await assertNoOverlappingBookings({
      db: tx,
      assignedHostId: booking.assignedHostId,
      eventTypeId: booking.eventTypeId,
      requestedStart: booking.startTime,
      requestedEnd: booking.endTime,
      beforeEventBuffer: booking.eventType.beforeEventBuffer,
      afterEventBuffer: booking.eventType.afterEventBuffer,
      excludeBookingId: booking.id,
      statuses: ["ACCEPTED"]
    });

    const paidBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: "PAID",
        status: "ACCEPTED"
      },
      include: bookingInclude
    });

    await tx.booking.updateMany({
      where: {
        id: { not: booking.id },
        status: "PENDING",
        startTime: booking.startTime,
        endTime: booking.endTime,
        assignedHostId: booking.assignedHostId
      },
      data: {
        status: "REJECTED",
        rejectionReason: "Another pending booking for this slot was accepted first."
      }
    });

    return paidBooking;
  });

  return mapBookingResponse(updated);
}

export async function rescheduleBooking(
  uid: string,
  start: string,
  reschedulingReason?: string | null,
  idempotencyKey?: string | null
) {
  logBookingDebug("rescheduleBooking:start", {
    uid,
    start,
    reschedulingReason: reschedulingReason ?? null,
    idempotencyKey: idempotencyKey ?? null
  });

  try {
    return await prisma.$transaction(
      async (tx: BookingExecutor) => {
        if (idempotencyKey) {
          const existing = await getBookingByIdempotencyKey(idempotencyKey, tx);
          if (existing) {
            logBookingDebug("rescheduleBooking:idempotentHit", {
              uid,
              bookingId: existing.id,
              bookingUid: existing.uid
            });
            return mapBookingResponse(existing);
          }
        }

        const original = await getBookingRecordOrThrow(uid, tx);
        logBookingDebug("rescheduleBooking:beforeUpdate", {
          uid,
          bookingId: original.id,
          status: original.status,
          startTime: original.startTime.toISOString(),
          endTime: original.endTime.toISOString()
        });
        assertAllowedTransition(original.status, ["ACCEPTED"], "reschedule");

        const primaryAttendee =
          original.attendees.find((attendee: AttendeeRecord) => attendee.isPrimary) ??
          original.attendees[0];

        if (!primaryAttendee) {
          throw new AppError(
            "ATTENDEE_NOT_FOUND",
            "Cannot reschedule a booking without an attendee.",
            400
          );
        }

        const newBooking = await createBookingRecord(
          {
            eventTypeId: original.eventTypeId,
            start,
            attendee: {
              name: primaryAttendee.name,
              email: primaryAttendee.email,
              timeZone: primaryAttendee.timeZone,
              language: primaryAttendee.language ?? "en"
            },
            guests: original.attendees
              .filter((attendee: AttendeeRecord) => !attendee.isPrimary)
              .map((attendee: AttendeeRecord) => attendee.email),
            location: original.location,
            notes: original.notes,
            responses: toPlainObject(original.responses),
            metadata: {
              ...toPlainObject(original.metadata),
              rescheduledFrom: original.uid
            },
            idempotencyKey
          },
          tx,
          {
            fromRescheduleUid: original.uid,
            idempotencyKey: idempotencyKey ?? null,
            excludeBookingId: original.id
          }
        );

        await tx.booking.update({
          where: { id: original.id },
          data: {
            status: "CANCELLED",
            rescheduled: true,
            cancellationReason: reschedulingReason ?? "Rescheduled",
            references: {
              updateMany: {
                where: { deleted: false },
                data: { deleted: true }
              }
            }
          }
        });

        const refreshedNewBooking = await tx.booking.findUnique({
          where: { id: newBooking.id },
          include: bookingInclude
        });

        if (!refreshedNewBooking) {
          throw new AppError("BOOKING_NOT_FOUND", "Rescheduled booking not found after update.", 404);
        }

        logBookingDebug("rescheduleBooking:afterUpdate", {
          uid,
          originalBookingId: original.id,
          originalBookingUid: original.uid,
          newBookingId: refreshedNewBooking.id,
          newBookingUid: refreshedNewBooking.uid,
          newStatus: refreshedNewBooking.status,
          newStartTime: refreshedNewBooking.startTime.toISOString(),
          newEndTime: refreshedNewBooking.endTime.toISOString()
        });

        return mapBookingResponse(refreshedNewBooking);
      },
      {
        isolationLevel: "Serializable",
        maxWait: TX_MAX_WAIT_MS,
        timeout: TX_TIMEOUT_MS
      }
    );
  } catch (error) {
    if (idempotencyKey && isUniqueConstraintError(error)) {
      const existing = await getBookingByIdempotencyKey(idempotencyKey);
      if (existing) {
        return mapBookingResponse(existing);
      }
    }

    if (isUniqueConstraintError(error) || isSerializationError(error)) {
      throw new AppError(
        "BOOKING_CONFLICT",
        "This slot is no longer available. Please choose another time.",
        409
      );
    }

    logBookingError("rescheduleBooking:failed", error, {
      uid,
      start,
      reschedulingReason: reschedulingReason ?? null,
      idempotencyKey: idempotencyKey ?? null
    });
    throw error;
  }
}
