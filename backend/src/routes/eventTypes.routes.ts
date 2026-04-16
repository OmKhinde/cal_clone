import { Router } from "express";
import {
  createEventTypeController,
  deleteEventTypeController,
  getEventTypeBySlugController,
  listEventTypesController,
  updateEventTypeController
} from "../controllers/eventTypes.controller.js";
import {
  createEventTypeSchema,
  eventTypeIdParamsSchema,
  eventTypeSlugParamsSchema,
  updateEventTypeSchema
} from "../schemas/eventTypes.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";

export const eventTypesRouter = Router();

eventTypesRouter.get("/", asyncHandler(listEventTypesController));
eventTypesRouter.get(
  "/:slug",
  validate(eventTypeSlugParamsSchema),
  asyncHandler(getEventTypeBySlugController)
);
eventTypesRouter.post("/", validate(createEventTypeSchema), asyncHandler(createEventTypeController));
eventTypesRouter.patch(
  "/:id",
  validate(updateEventTypeSchema),
  asyncHandler(updateEventTypeController)
);
eventTypesRouter.delete(
  "/:id",
  validate(eventTypeIdParamsSchema),
  asyncHandler(deleteEventTypeController)
);
