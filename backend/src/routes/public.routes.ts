import { Router } from "express";
import {
  getBookingByUidController,
  rescheduleBookingController,
  updateBookingStatusController
} from "../controllers/bookings.controller.js";
import { getPublicEventController } from "../controllers/eventTypes.controller.js";
import { validate } from "../middleware/validate.js";
import {
  bookingUidParamsSchema,
  rescheduleBookingSchema,
  updateBookingStatusSchema
} from "../schemas/bookings.schema.js";
import { publicEventParamsSchema } from "../schemas/eventTypes.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const publicRouter = Router();

publicRouter.get(
  "/event/:username/:slug",
  validate(publicEventParamsSchema),
  asyncHandler(getPublicEventController)
);

publicRouter.get(
  "/bookings/:uid",
  validate(bookingUidParamsSchema),
  asyncHandler(getBookingByUidController)
);

publicRouter.patch(
  "/bookings/:uid/status",
  validate(updateBookingStatusSchema),
  asyncHandler(updateBookingStatusController)
);

publicRouter.post(
  "/bookings/:uid/reschedules",
  validate(rescheduleBookingSchema),
  asyncHandler(rescheduleBookingController)
);
