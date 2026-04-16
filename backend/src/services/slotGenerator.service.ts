import {
  addDays,
  addMinutes,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isSameWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMinutes
} from "date-fns";
import { prisma } from "../prisma/client.js";
import type { PrismaExecutor } from "../types/index.js";
import type {
  BookingLimitFrequency,
  DayOfWeek,
  SchedulingType
} from "../types/enums.js";
import { AppError } from "../utils/appError.js";
import {
  addMinutesUtc,
  formatDateInTimezone,
  formatSlotLabel,
  getDayOfWeekForDate,
  isFuture,
  localTimeToUtc
} from "../utils/dateHelpers.js";

type BookingRow = {
  eventTypeId: number;
  startTime: Date;
  endTime: Date;
  status: string;
};

type EventTypeRow = {
  id: number;
  userId: number | null;
  duration: number;
  schedulingType: SchedulingType;
  maxAttendees: number | null;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  bookingLimitEnabled: boolean;
  bookingLimitCount: number | null;
  bookingLimitFrequency: BookingLimitFrequency | null;
  periodType: "UNLIMITED" | "ROLLING" | "RANGE";
  periodDays: number | null;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  timeZone: string | null;
};

type UserRow = {
  timezone: string;
};

type SlotInput = {
  date: string;
  timezone: string;
  startTime: string;
  endTime: string;
  duration: number;
  schedulingType: SchedulingType;
  maxAttendees: number | null;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  bookingLimitEnabled: boolean;
  bookingLimitCount: number | null;
  bookingLimitFrequency: BookingLimitFrequency | null;
  existingBookings: BookingRow[];
};

export type Slot = {
  startTime: string;
  label: string;
  available: boolean;
  remainingSeats?: number;
};

const INDIVIDUAL_SCHEDULING_TYPES = new Set(["INDIVIDUAL", "ONE_ON_ONE"]);

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return isBefore(startA, endB) && isAfter(endA, startB);
}

function sameLimitPeriod(
  left: Date,
  right: Date,
  frequency: BookingLimitFrequency | null
) {
  if (frequency === "DAY") return isSameDay(left, right);
  if (frequency === "WEEK") return isSameWeek(left, right, { weekStartsOn: 1 });
  if (frequency === "MONTH") return isSameMonth(left, right);
  return false;
}

function bookingLimitReached(slotStart: Date, input: SlotInput) {
  if (!input.bookingLimitEnabled || !input.bookingLimitCount || !input.bookingLimitFrequency) {
    return false;
  }

  const bookingsInPeriod = input.existingBookings.filter(
    (booking) =>
      (booking.status === "ACCEPTED" || booking.status === "PENDING") &&
      sameLimitPeriod(booking.startTime, slotStart, input.bookingLimitFrequency)
  );

  return bookingsInPeriod.length >= input.bookingLimitCount;
}

export function generateSlots(input: SlotInput): Array<{ startTime: Date; available: boolean; remainingSeats?: number }> {
  const windowStart = localTimeToUtc(input.date, input.startTime, input.timezone);
  const windowEnd = localTimeToUtc(input.date, input.endTime, input.timezone);
  const noticeCutoff = addMinutes(new Date(), input.minimumBookingNotice);
  const slots: Array<{ startTime: Date; available: boolean; remainingSeats?: number }> = [];
  let cursor = windowStart;

  while (addMinutesUtc(cursor, input.duration).getTime() <= windowEnd.getTime()) {
    const slotEnd = addMinutesUtc(cursor, input.duration);
    const blockStart = subMinutes(cursor, input.beforeEventBuffer);
    const blockEnd = addMinutesUtc(cursor, input.duration + input.afterEventBuffer);
    const overlappingBookings = input.existingBookings.filter(
      (booking) =>
        (booking.status === "ACCEPTED" || booking.status === "PENDING") &&
        rangesOverlap(blockStart, blockEnd, booking.startTime, booking.endTime)
    );

    let isAvailable = isFuture(cursor) && !isBefore(cursor, noticeCutoff);
    let remainingSeats: number | undefined;

    isAvailable = isAvailable && overlappingBookings.length === 0;

    if (isAvailable && bookingLimitReached(cursor, input)) {
      isAvailable = false;
    }

    slots.push({ startTime: new Date(cursor), available: isAvailable, remainingSeats });

    cursor = slotEnd;
  }

  return slots;
}

function getBookingWindow(eventType: EventTypeRow) {
  if (eventType.periodType === "UNLIMITED") {
    return {
      start: new Date(),
      end: addYears(new Date(), 10)
    };
  }

  if (eventType.periodType === "RANGE") {
    return {
      start: eventType.periodStartDate,
      end: eventType.periodEndDate
    };
  }

  return {
    start: new Date(),
    end: endOfDay(addDays(new Date(), eventType.periodDays ?? 30))
  };
}

function isDateOutsideBookingWindow(dayStart: Date, dayEnd: Date, eventType: EventTypeRow) {
  const window = getBookingWindow(eventType);

  if (window.start && isBefore(dayEnd, window.start)) {
    return true;
  }

  if (window.end && isAfter(dayStart, window.end)) {
    return true;
  }

  return false;
}

function getBookingQueryWindow(
  dayStart: Date,
  dayEnd: Date,
  eventType: EventTypeRow
): { start: Date; end: Date } {
  let start = subMinutes(dayStart, eventType.beforeEventBuffer);
  let end = addMinutes(dayEnd, eventType.duration + eventType.afterEventBuffer);

  if (eventType.bookingLimitEnabled) {
    if (eventType.bookingLimitFrequency === "WEEK") {
      start = startOfWeek(dayStart, { weekStartsOn: 1 });
      end = endOfWeek(dayStart, { weekStartsOn: 1 });
    }

    if (eventType.bookingLimitFrequency === "MONTH") {
      start = startOfMonth(dayStart);
      end = endOfMonth(dayStart);
    }

    if (eventType.bookingLimitFrequency === "DAY") {
      start = startOfDay(dayStart);
      end = endOfDay(dayStart);
    }
  }

  return { start, end };
}

export async function getSlotsForDate(eventTypeId: number, date: string, db: PrismaExecutor = prisma) {
  const eventType = await db.eventType.findFirst({
    where: { id: eventTypeId, isActive: true },
    include: { user: true }
  });

  if (!eventType) {
    throw new AppError("EVENT_TYPE_NOT_FOUND", "Event type not found.", 404);
  }

  if (!eventType.user || eventType.userId === null) {
    throw new AppError(
      "TEAM_EVENT_NOT_SUPPORTED",
      "Team-owned slot generation is not supported in this API version.",
      400
    );
  }

  if (!INDIVIDUAL_SCHEDULING_TYPES.has(eventType.schedulingType)) {
    throw new AppError(
      "SCHEDULING_TYPE_NOT_SUPPORTED",
      "Scheduling type not supported.",
      400
    );
  }

  const hostTimezone = eventType.timeZone ?? eventType.user.timezone;
  const dayStart = localTimeToUtc(date, "00:00", hostTimezone);
  const nextDate = formatDateInTimezone(addMinutesUtc(dayStart, 36 * 60), hostTimezone);
  const dayEnd = localTimeToUtc(nextDate, "00:00", hostTimezone);

  if (isDateOutsideBookingWindow(dayStart, dayEnd, eventType)) {
    return {
      date,
      timezone: hostTimezone,
      eventType,
      slots: [] as Slot[]
    };
  }

  const dayOfWeek = getDayOfWeekForDate(date, hostTimezone);
  const availability = await db.availability.findUnique({
    where: {
      userId_dayOfWeek: {
        userId: eventType.userId,
        dayOfWeek
      }
    }
  });

  if (!availability || !availability.isActive) {
    return {
      date,
      timezone: hostTimezone,
      eventType,
      slots: [] as Slot[]
    };
  }

  const queryWindow = getBookingQueryWindow(dayStart, dayEnd, eventType);

  const existingBookings = await db.booking.findMany({
    where: {
      status: { in: ["ACCEPTED", "PENDING"] },
      startTime: { lt: queryWindow.end },
      endTime: { gt: queryWindow.start },
      OR: [
        { assignedHostId: eventType.userId },
        {
          assignedHostId: null,
          eventType: {
            userId: eventType.userId
          }
        }
      ]
    },
    select: { eventTypeId: true, startTime: true, endTime: true, status: true }
  });

  const slots = generateSlots({
    date,
    timezone: hostTimezone,
    startTime: availability.startTime,
    endTime: availability.endTime,
    duration: eventType.duration,
    schedulingType: eventType.schedulingType,
    maxAttendees: eventType.maxAttendees,
    minimumBookingNotice: eventType.minimumBookingNotice,
    beforeEventBuffer: eventType.beforeEventBuffer,
    afterEventBuffer: eventType.afterEventBuffer,
    bookingLimitEnabled: eventType.bookingLimitEnabled,
    bookingLimitCount: eventType.bookingLimitCount,
    bookingLimitFrequency: eventType.bookingLimitFrequency,
    existingBookings
  }).map((slot) => ({
    startTime: slot.startTime.toISOString(),
    label: formatSlotLabel(slot.startTime, hostTimezone),
    available: slot.available,
    ...(slot.remainingSeats !== undefined ? { remainingSeats: slot.remainingSeats } : {})
  }));

  return {
    date,
    timezone: hostTimezone,
    eventType,
    slots
  };
}

export function getDateForSlot(startTime: Date, user: Pick<UserRow, "timezone">): string {
  return formatDateInTimezone(startTime, user.timezone);
}

export type EventTypeWithUser = EventTypeRow & { user: UserRow };
