import { z } from "zod";

export const slotsQuerySchema = z.object({
  query: z.object({
    eventTypeId: z.coerce.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  })
});

const attendeeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  timeZone: z.string().trim().min(1).max(120),
  language: z.string().trim().min(2).max(16).optional().default("en")
});

export const createBookingSchema = z.object({
  body: z.object({
    eventTypeId: z.number().int().positive(),
    start: z.string().datetime().optional(),
    startTime: z.string().datetime().optional(),
    attendee: attendeeSchema.optional(),
    bookerName: z.string().trim().min(1).max(100).optional(),
    bookerEmail: z.string().trim().email().max(255).optional(),
    timeZone: z.string().trim().min(1).max(120).optional(),
    language: z.string().trim().min(2).max(16).optional(),
    guests: z.array(z.string().trim().email().max(255)).max(25).optional().default([]),
    location: z.string().trim().max(255).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    responses: z.record(z.string(), z.unknown()).optional().default({}),
    metadata: z.record(z.string(), z.unknown()).optional().default({})
  }).superRefine((value, ctx) => {
    if (!value.start && !value.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide start or startTime.",
        path: ["start"]
      });
    }

    const hasAttendee = Boolean(value.attendee);
    const hasLegacyBooker = Boolean(value.bookerName && value.bookerEmail);

    if (!hasAttendee && !hasLegacyBooker) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide attendee or bookerName/bookerEmail.",
        path: ["attendee"]
      });
    }
  })
});

export const bookingsQuerySchema = z.object({
  query: z.object({
    status: z.enum(["upcoming", "past", "cancelled", "pending"]).optional().default("upcoming"),
    take: z.coerce.number().int().min(1).max(100).optional().default(20),
    skip: z.coerce.number().int().min(0).optional().default(0),
    eventTypeId: z.coerce.number().int().positive().optional(),
    attendeeEmail: z.string().trim().email().max(255).optional(),
    afterStart: z.string().datetime().optional(),
    beforeStart: z.string().datetime().optional(),
    sortStart: z.enum(["asc", "desc"]).optional()
  })
});

export const bookingUidParamsSchema = z.object({
  params: z.object({
    uid: z.string().trim().min(1).max(191)
  })
});

export const cancelBookingSchema = z.object({
  params: z.object({
    uid: z.string().trim().min(1).max(191)
  }),
  body: z.object({
    cancellationReason: z.string().trim().max(1000).optional().nullable()
  }).default({})
});

export const confirmBookingSchema = z.object({
  params: z.object({
    uid: z.string().trim().min(1).max(191)
  })
});

export const updateBookingStatusSchema = z.object({
  params: z.object({
    uid: z.string().trim().min(1).max(191)
  }),
  body: z
    .object({
      status: z.enum(["ACCEPTED", "CANCELLED"]),
      cancellationReason: z.string().trim().max(1000).optional().nullable()
    })
    .superRefine((value, ctx) => {
      if (value.status !== "CANCELLED" && value.cancellationReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cancellationReason is only allowed when status is CANCELLED.",
          path: ["cancellationReason"]
        });
      }
    })
});

export const rescheduleBookingSchema = z.object({
  params: z.object({
    uid: z.string().trim().min(1).max(191)
  }),
  body: z.object({
    start: z.string().datetime(),
    reschedulingReason: z.string().trim().max(1000).optional().nullable()
  })
});

export const addGuestsSchema = z.object({
  params: z.object({
    uid: z.string().trim().min(1).max(191)
  }),
  body: z.object({
    guests: z.array(z.string().trim().email().max(255)).min(1).max(25)
  })
});

export const markPaidSchema = z.object({
  params: z.object({
    uid: z.string().trim().min(1).max(191)
  }),
  body: z.object({
    paymentStatus: z.literal("PAID")
  })
});
