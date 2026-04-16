import type { Request, Response } from "express";
import {
  addGuests,
  confirmBooking,
  cancelBooking,
  createBooking,
  getBookingByUid,
  listBookings
  ,
  markAsPaid,
  rescheduleBooking
} from "../services/bookings.service.js";
import { AppError } from "../utils/appError.js";

function getIdempotencyKey(req: Request) {
  const headerValue = req.header("Idempotency-Key");

  if (headerValue === undefined) {
    return undefined;
  }

  const value = headerValue.trim();
  if (!value) {
    throw new AppError("VALIDATION_ERROR", "Idempotency-Key header cannot be empty.", 400);
  }

  return value;
}

export async function createBookingController(req: Request, res: Response) {
  const data = await createBooking({
    ...req.body,
    idempotencyKey: getIdempotencyKey(req)
  });
  res.status(201).json({ data });
}

export async function listBookingsController(req: Request, res: Response) {
  const status =
    req.query.status === "past" ||
    req.query.status === "cancelled" ||
    req.query.status === "pending"
      ? req.query.status
      : "upcoming";
  const take = Number(req.query.take ?? 20);
  const skip = Number(req.query.skip ?? 0);
  const result = await listBookings(status, {
    take,
    skip,
    eventTypeId: req.query.eventTypeId ? Number(req.query.eventTypeId) : undefined,
    attendeeEmail: req.query.attendeeEmail ? String(req.query.attendeeEmail) : undefined,
    afterStart: req.query.afterStart ? String(req.query.afterStart) : undefined,
    beforeStart: req.query.beforeStart ? String(req.query.beforeStart) : undefined,
    sortStart: req.query.sortStart === "asc" || req.query.sortStart === "desc" ? req.query.sortStart : undefined
  });
  res.json(result);
}

export async function getBookingByUidController(req: Request, res: Response) {
  const data = await getBookingByUid(String(req.params.uid));
  res.json({ data });
}

export async function cancelBookingController(req: Request, res: Response) {
  const data = await cancelBooking(String(req.params.uid), req.body?.cancellationReason);
  res.json({ data });
}

export async function updateBookingStatusController(req: Request, res: Response) {
  const uid = String(req.params.uid);

  if (req.body.status === "CANCELLED") {
    const data = await cancelBooking(uid, req.body?.cancellationReason);
    res.json({ data });
    return;
  }

  if (req.body.status === "ACCEPTED") {
    const data = await confirmBooking(uid);
    res.json({ data });
    return;
  }

  throw new AppError("VALIDATION_ERROR", "Unsupported booking status update.", 400);
}

export async function confirmBookingController(req: Request, res: Response) {
  const data = await confirmBooking(String(req.params.uid));
  res.json({ data });
}

export async function rescheduleBookingController(req: Request, res: Response) {
  const data = await rescheduleBooking(
    String(req.params.uid),
    req.body.start,
    req.body.reschedulingReason,
    getIdempotencyKey(req)
  );
  res.status(201).json({ data });
}

export async function addGuestsController(req: Request, res: Response) {
  const data = await addGuests(String(req.params.uid), req.body.guests);
  res.json({ data });
}

export async function markAsPaidController(req: Request, res: Response) {
  const data = await markAsPaid(String(req.params.uid));
  res.json({ data });
}
