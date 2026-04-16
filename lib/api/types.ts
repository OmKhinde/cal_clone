export type SchedulingType = "INDIVIDUAL" | "ROUND_ROBIN" | "COLLECTIVE";
export type PeriodType = "UNLIMITED" | "ROLLING" | "RANGE";
export type BookingLimitFrequency = "DAY" | "WEEK" | "MONTH";
export type BookingStatus = "ACCEPTED" | "CANCELLED" | "REJECTED" | "PENDING";
export type BookingPaymentStatus = "NOT_REQUIRED" | "REQUIRED" | "PAID";
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type EventLocation = {
  type: string;
};

export type BookingField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "phone";
  required: boolean;
  options?: string[];
  placeholder?: string;
};

export type EventType = {
  id: number;
  userId?: number | null;
  title: string;
  description?: string | null;
  duration: number;
  slug: string;
  isActive: boolean;
  isHidden: boolean;
  color: string;
  schedulingType: SchedulingType;
  maxAttendees?: number | null;
  timeZone?: string | null;
  periodType: PeriodType;
  periodDays?: number | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  bookingLimitEnabled: boolean;
  bookingLimitCount?: number | null;
  bookingLimitFrequency?: BookingLimitFrequency | null;
  locations?: EventLocation[] | null;
  bookingFields?: BookingField[] | null;
  requiresConfirmation: boolean;
  price: number;
  currency: string;
  paymentEnabled: boolean;
  successRedirectUrl?: string | null;
  bookingUrl: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id?: number;
    name?: string;
    email?: string;
    username: string;
    timezone?: string;
  } | null;
  hosts?: Array<{
    id: number;
    user: {
      id: number;
      name: string;
      username: string;
    };
  }>;
  _count?: {
    bookings: number;
  };
};

export type PublicEvent = {
  id: number;
  title: string;
  description?: string | null;
  duration: number;
  slug: string;
  bookingUrl: string;
  hosts: Array<{
    name: string;
    username: string;
  }>;
  schedulingType: SchedulingType;
  locations: EventLocation[];
  bookingFields: BookingField[];
  requiresConfirmation: boolean;
  paymentEnabled: boolean;
  price: number;
  currency: string;
  color: string;
};

export type AvailabilityRow = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type AvailabilityResponse = {
  timezone: string;
  schedule: AvailabilityRow[];
};

export type Slot = {
  startTime: string;
  label: string;
  available: boolean;
  remainingSeats?: number;
};

export type SlotsResponse = {
  date: string;
  timezone: string;
  slots: Slot[];
};

export type Booking = {
  id: number;
  uid: string;
  cancelToken?: string | null;
  title: string;
  description?: string | null;
  status: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  start: string;
  end: string;
  duration: number;
  location?: string | null;
  videoCallUrl?: string | null;
  meetingUrl?: string | null;
  attendee?: {
    name: string;
    email: string;
    timeZone: string;
    language?: string | null;
  } | null;
  attendees: Array<{
    name: string;
    email: string;
    timeZone: string;
    language?: string | null;
  }>;
  guests: string[];
  hosts: Array<{
    id: number;
    name: string;
    email: string;
    timeZone: string;
  }>;
  responses?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  rescheduled?: boolean;
  fromRescheduleUid?: string | null;
  absentHost?: boolean;
  references?: Array<{
    id: number;
    type: string;
    uid: string;
    meetingId?: string | null;
    meetingUrl?: string | null;
    externalCalendarId?: string | null;
    deleted?: boolean | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
  eventType: {
    id: number;
    slug: string;
    title: string;
  };
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type EventTypePayload = {
  title: string;
  description?: string | null;
  duration: number;
  slug: string;
  color?: string;
  schedulingType?: SchedulingType;
  maxAttendees?: number | null;
  timeZone?: string | null;
  periodType?: PeriodType;
  periodDays?: number | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  bookingLimitEnabled?: boolean;
  bookingLimitCount?: number | null;
  bookingLimitFrequency?: BookingLimitFrequency | null;
  locations?: EventLocation[] | null;
  bookingFields?: BookingField[] | null;
  isHidden?: boolean;
  requiresConfirmation?: boolean;
  paymentEnabled?: boolean;
  price?: number;
  currency?: string;
  successRedirectUrl?: string | null;
  isActive?: boolean;
};

export type CreateBookingPayload = {
  eventTypeId: number;
  start: string;
  attendee: {
    name: string;
    email: string;
    timeZone: string;
    language?: string;
  };
  guests?: string[];
  location?: string | null;
  notes?: string | null;
  responses?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type BookingListResponse = {
  status: "success";
  data: Booking[];
  meta: {
    total: number;
    take: number;
    skip: number;
    hasMore: boolean;
  };
};
