import { Router } from "express";
import {
  addGuestsController,
  confirmBookingController,
  cancelBookingController,
  createBookingController,
  getBookingByUidController,
  listBookingsController
  ,
  markAsPaidController,
  rescheduleBookingController,
  updateBookingStatusController
} from "../controllers/bookings.controller.js";
import {
  addGuestsSchema,
  bookingsQuerySchema,
  bookingUidParamsSchema,
  cancelBookingSchema,
  confirmBookingSchema,
  createBookingSchema
  ,
  markPaidSchema,
  rescheduleBookingSchema,
  updateBookingStatusSchema
} from "../schemas/bookings.schema.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const bookingsRouter = Router();

bookingsRouter.post("/", validate(createBookingSchema), asyncHandler(createBookingController));
bookingsRouter.get("/", validate(bookingsQuerySchema), asyncHandler(listBookingsController));
bookingsRouter.get("/:uid", validate(bookingUidParamsSchema), asyncHandler(getBookingByUidController));
bookingsRouter.post(
  "/:uid/attendees",
  validate(addGuestsSchema),
  asyncHandler(addGuestsController)
);
bookingsRouter.patch(
  "/:uid/status",
  validate(updateBookingStatusSchema),
  asyncHandler(updateBookingStatusController)
);
bookingsRouter.post(
  "/:uid/reschedules",
  validate(rescheduleBookingSchema),
  asyncHandler(rescheduleBookingController)
);
bookingsRouter.patch(
  "/:uid/payment",
  validate(markPaidSchema),
  asyncHandler(markAsPaidController)
);

// Compatibility aliases for the older RPC-style surface.
bookingsRouter.post(
  "/:uid/guests",
  validate(addGuestsSchema),
  asyncHandler(addGuestsController)
);
bookingsRouter.post(
  "/:uid/confirm",
  validate(confirmBookingSchema),
  asyncHandler(confirmBookingController)
);
bookingsRouter.post(
  "/:uid/reschedule",
  validate(rescheduleBookingSchema),
  asyncHandler(rescheduleBookingController)
);
bookingsRouter.post(
  "/:uid/mark-paid",
  validate(markPaidSchema),
  asyncHandler(markAsPaidController)
);
bookingsRouter.patch(
  "/:uid/cancel",
  validate(cancelBookingSchema),
  asyncHandler(cancelBookingController)
);
