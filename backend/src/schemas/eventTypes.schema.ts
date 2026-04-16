import { z } from "zod";
import {
  BOOKING_LIMIT_FREQUENCY_VALUES,
  PERIOD_TYPE_VALUES,
  SCHEDULING_TYPE_VALUES,
  type BookingLimitFrequency,
  type PeriodType,
  type SchedulingType
} from "../types/enums.js";
import { isValidTimeZone } from "../utils/timezone.js";

const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");

const usernameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");

const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.")
  .optional();

const durationSchema = z
  .number()
  .int()
  .min(5)
  .max(720)
  .refine((value) => value % 5 === 0, "Duration must use 5-minute granularity.");

const nonNegativeMinutesSchema = z.number().int().min(0).max(10080);

const locationSchema = z
  .object({
    type: z.string().trim().min(1).max(80)
  })
  .passthrough();

const bookingFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(160),
    type: z.enum(["text", "textarea", "select", "checkbox", "phone"]),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(120)).optional(),
    placeholder: z.string().trim().max(160).optional()
  })
  .refine((field) => field.type !== "select" || Boolean(field.options?.length), {
    message: "Select booking fields require options.",
    path: ["options"]
  });

const eventTypeFieldsSchema = z.object({
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().max(600).optional().nullable(),
    duration: durationSchema,
    slug: slugSchema,
    color: colorSchema,
    schedulingType: z.enum(SCHEDULING_TYPE_VALUES).optional().default("INDIVIDUAL"),
    maxAttendees: z.number().int().min(2).max(10000).optional().nullable(),
    timeZone: z.string().refine(isValidTimeZone, "Use a valid IANA timezone.").optional().nullable(),
    periodType: z.enum(PERIOD_TYPE_VALUES).optional().default("ROLLING"),
    periodDays: z.number().int().min(1).max(730).optional().nullable(),
    periodStartDate: z.string().datetime().optional().nullable(),
    periodEndDate: z.string().datetime().optional().nullable(),
    minimumBookingNotice: nonNegativeMinutesSchema.optional().default(0),
    beforeEventBuffer: nonNegativeMinutesSchema.optional().default(0),
    afterEventBuffer: nonNegativeMinutesSchema.optional().default(0),
    bookingLimitEnabled: z.boolean().optional().default(false),
    bookingLimitCount: z.number().int().min(1).max(10000).optional().nullable(),
    bookingLimitFrequency: z.enum(BOOKING_LIMIT_FREQUENCY_VALUES).optional().nullable(),
    locations: z.array(locationSchema).max(10).optional().nullable(),
    bookingFields: z.array(bookingFieldSchema).max(20).optional().nullable(),
    isHidden: z.boolean().optional().default(false),
    requiresConfirmation: z.boolean().optional().default(false),
    paymentEnabled: z.boolean().optional().default(false),
    price: z.number().int().min(0).optional().default(0),
    currency: z.string().trim().length(3).toLowerCase().optional().default("usd"),
    successRedirectUrl: z.string().url().optional().nullable()
  });

function withEventTypeRules<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const eventType = value as {
      schedulingType?: SchedulingType;
      maxAttendees?: number | null;
      periodType?: PeriodType;
      periodDays?: number | null;
      periodStartDate?: string | null;
      periodEndDate?: string | null;
      bookingLimitEnabled?: boolean;
      bookingLimitCount?: number | null;
      bookingLimitFrequency?: BookingLimitFrequency | null;
      paymentEnabled?: boolean;
      price?: number;
    };

    if (eventType.maxAttendees) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "maxAttendees is not supported in this API version.",
        path: ["maxAttendees"]
      });
    }

    if (eventType.periodType === "ROLLING" && !eventType.periodDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodDays is required when periodType is ROLLING.",
        path: ["periodDays"]
      });
    }

    if (eventType.periodType === "RANGE") {
      if (!eventType.periodStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "periodStartDate is required when periodType is RANGE.",
          path: ["periodStartDate"]
        });
      }

      if (!eventType.periodEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "periodEndDate is required when periodType is RANGE.",
          path: ["periodEndDate"]
        });
      }

      if (
        eventType.periodStartDate &&
        eventType.periodEndDate &&
        new Date(eventType.periodStartDate).getTime() >= new Date(eventType.periodEndDate).getTime()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "periodEndDate must be after periodStartDate.",
          path: ["periodEndDate"]
        });
      }
    }

    if (eventType.bookingLimitEnabled && (!eventType.bookingLimitCount || !eventType.bookingLimitFrequency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bookingLimitCount and bookingLimitFrequency are required when booking limits are enabled.",
        path: ["bookingLimitCount"]
      });
    }

    if (eventType.paymentEnabled && (eventType.price ?? 0) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "price must be greater than zero when payment is enabled.",
        path: ["price"]
      });
    }
  });
}

const eventTypeBodySchema = withEventTypeRules(eventTypeFieldsSchema);

export const eventTypeIdParamsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  })
});

export const eventTypeSlugParamsSchema = z.object({
  params: z.object({
    slug: slugSchema
  })
});

export const publicEventParamsSchema = z.object({
  params: z.object({
    username: usernameSchema,
    slug: slugSchema
  })
});

export const publicProfileParamsSchema = z.object({
  params: z.object({
    username: usernameSchema
  })
});

export const createEventTypeSchema = z.object({
  body: eventTypeBodySchema
});

export const updateEventTypeSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  body: withEventTypeRules(
    eventTypeFieldsSchema.partial().extend({
      isActive: z.boolean().optional()
    })
  )
    .refine((value) => Object.keys(value).length > 0, {
      message: "Provide at least one field to update."
    })
});
