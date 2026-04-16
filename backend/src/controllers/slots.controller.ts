import type { Request, Response } from "express";
import { getSlotsForDate } from "../services/slotGenerator.service.js";

export async function getSlotsController(req: Request, res: Response) {
  const eventTypeId = Number(req.query.eventTypeId);
  const date = String(req.query.date);
  const data = await getSlotsForDate(eventTypeId, date);

  res.json({
    date: data.date,
    timezone: data.timezone,
    slots: data.slots
  });
}
