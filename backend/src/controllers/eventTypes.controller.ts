import type { Request, Response } from "express";
import {
  createEventType,
  deleteEventType,
  getEventTypeBySlug,
  getPublicEvent,
  listEventTypes,
  updateEventType
} from "../services/eventTypes.service.js";

export async function listEventTypesController(_req: Request, res: Response) {
  const data = await listEventTypes();
  res.json({ data });
}

export async function getEventTypeBySlugController(req: Request, res: Response) {
  const data = await getEventTypeBySlug(String(req.params.slug));
  res.json({ data });
}

export async function createEventTypeController(req: Request, res: Response) {
  const data = await createEventType(req.body);
  res.status(201).json({ data });
}

export async function updateEventTypeController(req: Request, res: Response) {
  const data = await updateEventType(Number(req.params.id), req.body);
  res.json({ data });
}

export async function deleteEventTypeController(req: Request, res: Response) {
  const data = await deleteEventType(Number(req.params.id));
  res.json({ data });
}

export async function getPublicEventController(req: Request, res: Response) {
  const data = await getPublicEvent(String(req.params.username), String(req.params.slug));
  res.json({ data });
}
