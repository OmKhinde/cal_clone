export const DAY_OF_WEEK_VALUES = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY"
] as const;

export const SCHEDULING_TYPE_VALUES = [
  "INDIVIDUAL",
  "ROUND_ROBIN",
  "COLLECTIVE"
] as const;

export const PERIOD_TYPE_VALUES = [
  "UNLIMITED",
  "ROLLING",
  "RANGE"
] as const;

export const BOOKING_LIMIT_FREQUENCY_VALUES = [
  "DAY",
  "WEEK",
  "MONTH"
] as const;

export const BOOKING_STATUS_VALUES = [
  "ACCEPTED",
  "PENDING",
  "CANCELLED",
  "REJECTED"
] as const;

export const BOOKING_PAYMENT_STATUS_VALUES = [
  "NOT_REQUIRED",
  "REQUIRED",
  "PAID"
] as const;

export type DayOfWeek = (typeof DAY_OF_WEEK_VALUES)[number];
export type SchedulingType = (typeof SCHEDULING_TYPE_VALUES)[number];
export type PeriodType = (typeof PERIOD_TYPE_VALUES)[number];
export type BookingLimitFrequency = (typeof BOOKING_LIMIT_FREQUENCY_VALUES)[number];
export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];
export type BookingPaymentStatus = (typeof BOOKING_PAYMENT_STATUS_VALUES)[number];
