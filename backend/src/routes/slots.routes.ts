import { Router } from "express";
import { getSlotsController } from "../controllers/slots.controller.js";
import { slotsQuerySchema } from "../schemas/bookings.schema.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const slotsRouter = Router();

slotsRouter.get("/", validate(slotsQuerySchema), asyncHandler(getSlotsController));
