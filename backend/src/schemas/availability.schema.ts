import { z } from "zod";
import { DAY_OF_WEEK_VALUES } from "../types/enums.js";
import { isValidTimeZone } from "../utils/timezone.js";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm 24-hour time.");

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export const updateAvailabilitySchema = z.object({
  body: z.object({
    timezone: z.string().refine(isValidTimeZone, "Use a valid IANA timezone."),
    schedule: z
      .array(
        z
          .object({
            dayOfWeek: z.enum(DAY_OF_WEEK_VALUES),
            startTime: timeSchema,
            endTime: timeSchema,
            isActive: z.boolean()
          })
          .refine((value) => timeToMinutes(value.startTime) < timeToMinutes(value.endTime), {
            message: "startTime must be before endTime.",
            path: ["endTime"]
          })
      )
      .max(7)
  })
});
