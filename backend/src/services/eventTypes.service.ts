import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { AppError } from "../utils/appError.js";
import { getDefaultUser } from "./defaultUser.service.js";

type CreateEventTypeInput = {
  title: string;
  description?: string | null;
  duration: number;
  slug: string;
  color?: string;
  schedulingType?: "INDIVIDUAL" | "ROUND_ROBIN" | "COLLECTIVE" | "ONE_ON_ONE";
  maxAttendees?: number | null;
  timeZone?: string | null;
  periodType?: "UNLIMITED" | "ROLLING" | "RANGE";
  periodDays?: number | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  bookingLimitEnabled?: boolean;
  bookingLimitCount?: number | null;
  bookingLimitFrequency?: "DAY" | "WEEK" | "MONTH" | null;
  locations?: Record<string, unknown>[] | null;
  bookingFields?: Record<string, unknown>[] | null;
  isHidden?: boolean;
  requiresConfirmation?: boolean;
  paymentEnabled?: boolean;
  price?: number;
  currency?: string;
  successRedirectUrl?: string | null;
};

type UpdateEventTypeInput = Partial<CreateEventTypeInput> & {
  isActive?: boolean;
};

type EventTypeListItem = Record<string, any> & {
  user?: { username: string } | null;
  _count?: { bookings: number };
  slug: string;
};

const eventTypeListInclude = {
  user: {
    select: { username: true }
  },
  _count: {
    select: { bookings: true }
  }
} as const;

function bookingUrl(username: string, slug: string) {
  return `${env.FRONTEND_URL.replace(/\/$/, "")}/u/${username}/${slug}`;
}

function normalizeEventTypeInput(input: CreateEventTypeInput | UpdateEventTypeInput) {
  return {
    ...input,
    schedulingType:
      input.schedulingType === "ONE_ON_ONE" || input.schedulingType === undefined
        ? "INDIVIDUAL"
        : input.schedulingType,
    periodStartDate: input.periodStartDate ? new Date(input.periodStartDate) : input.periodStartDate,
    periodEndDate: input.periodEndDate ? new Date(input.periodEndDate) : input.periodEndDate,
    locations: input.locations ?? null,
    bookingFields: input.bookingFields ?? null,
    currency: input.currency?.toLowerCase()
  };
}

function withBookingUrl(eventType: EventTypeListItem) {
  const username = eventType.user?.username ?? "demo";
  return {
    ...eventType,
    schedulingType: eventType.schedulingType === "ONE_ON_ONE" ? "INDIVIDUAL" : eventType.schedulingType,
    bookingUrl: bookingUrl(username, eventType.slug)
  };
}

function mapUniqueError(error: unknown): never {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    throw new AppError("SLUG_TAKEN", "An event type with this slug already exists.", 409);
  }
  throw error;
}

export async function listEventTypes() {
  const user = await getDefaultUser();
  const eventTypes = await prisma.eventType.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: eventTypeListInclude
  });

  return eventTypes.map(withBookingUrl);
}

export async function getEventTypeBySlug(slug: string) {
  const user = await getDefaultUser();
  const eventType = await prisma.eventType.findFirst({
    where: { slug, userId: user.id, isActive: true },
    include: {
      user: {
        select: { id: true, name: true, email: true, username: true, timezone: true }
      },
      hosts: {
        include: {
          user: {
            select: { id: true, name: true, username: true }
          }
        }
      }
    }
  });

  if (!eventType) {
    throw new AppError("EVENT_TYPE_NOT_FOUND", "Event type not found.", 404);
  }

  return withBookingUrl(eventType);
}

export async function getPublicEvent(username: string, slug: string) {
  const eventType = await prisma.eventType.findFirst({
    where: {
      slug,
      isActive: true,
      user: { username }
    },
    include: {
      user: {
        select: { name: true, username: true, timezone: true }
      },
      hosts: {
        include: {
          user: {
            select: { name: true, username: true }
          }
        }
      }
    }
  });

  if (!eventType) {
    throw new AppError("EVENT_TYPE_NOT_FOUND", "Event type not found.", 404);
  }

  const primaryHost = eventType.user
    ? [{ name: eventType.user.name, username: eventType.user.username }]
    : eventType.hosts.map((host: any) => ({ name: host.user.name, username: host.user.username }));

  return {
    id: eventType.id,
    title: eventType.title,
    description: eventType.description,
    duration: eventType.duration,
    slug: eventType.slug,
    bookingUrl: bookingUrl(username, eventType.slug),
    hosts: primaryHost,
    schedulingType: eventType.schedulingType === "ONE_ON_ONE" ? "INDIVIDUAL" : eventType.schedulingType,
    locations: eventType.locations ?? [],
    bookingFields: eventType.bookingFields ?? [],
    requiresConfirmation: eventType.requiresConfirmation,
    paymentEnabled: eventType.paymentEnabled,
    price: eventType.price,
    currency: eventType.currency,
    color: eventType.color
  };
}

export async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      name: true,
      username: true,
      timezone: true,
      eventTypes: {
        where: {
          isActive: true,
          isHidden: false
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" }
        ],
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
          slug: true,
          color: true,
          schedulingType: true,
          user: {
            select: {
              username: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw new AppError("PUBLIC_PROFILE_NOT_FOUND", "Public profile not found.", 404);
  }

  return {
    name: user.name,
    username: user.username,
    timezone: user.timezone,
    events: user.eventTypes.map((eventType) => ({
      id: eventType.id,
      title: eventType.title,
      description: eventType.description,
      duration: eventType.duration,
      slug: eventType.slug,
      color: eventType.color,
      schedulingType:
        eventType.schedulingType === "ONE_ON_ONE" ? "INDIVIDUAL" : eventType.schedulingType,
      bookingUrl: bookingUrl(user.username, eventType.slug)
    }))
  };
}

export async function createEventType(input: CreateEventTypeInput) {
  const user = await getDefaultUser();
  const data = normalizeEventTypeInput(input) as any;

  try {
    const eventType = await prisma.eventType.create({
      data: {
        userId: user.id,
        ...data,
        color: typeof data.color === "string" ? data.color : "#6366f1"
      },
      include: eventTypeListInclude
    });

    return withBookingUrl(eventType);
  } catch (error) {
    mapUniqueError(error);
  }
}

export async function updateEventType(id: number, input: UpdateEventTypeInput) {
  const user = await getDefaultUser();
  const existing = await prisma.eventType.findFirst({ where: { id, userId: user.id } });

  if (!existing) {
    throw new AppError("EVENT_TYPE_NOT_FOUND", "Event type not found.", 404);
  }

  try {
    const eventType = await prisma.eventType.update({
      where: { id },
      data: normalizeEventTypeInput(input) as Record<string, unknown>,
      include: eventTypeListInclude
    });

    return withBookingUrl(eventType);
  } catch (error) {
    mapUniqueError(error);
  }
}

export async function deleteEventType(id: number) {
  const user = await getDefaultUser();
  const existing = await prisma.eventType.findFirst({
    where: { id, userId: user.id },
    include: eventTypeListInclude
  });

  if (!existing) {
    throw new AppError("EVENT_TYPE_NOT_FOUND", "Event type not found.", 404);
  }

  const deleted = await prisma.eventType.delete({
    where: { id },
    include: eventTypeListInclude
  });

  return withBookingUrl(deleted);
}
