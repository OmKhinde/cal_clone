import type { Request, Response } from "express";
import { getAvailability, replaceAvailability } from "../services/availability.service.js";

export async function getAvailabilityController(_req: Request, res: Response) {
  const data = await getAvailability();
  res.json(data);
}

export async function replaceAvailabilityController(req: Request, res: Response) {
  const data = await replaceAvailability(req.body.timezone, req.body.schedule);
  res.json(data);
}
