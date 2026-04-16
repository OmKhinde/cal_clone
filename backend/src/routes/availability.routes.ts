import { Router } from "express";
import {
  getAvailabilityController,
  replaceAvailabilityController
} from "../controllers/availability.controller.js";
import { updateAvailabilitySchema } from "../schemas/availability.schema.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const availabilityRouter = Router();

availabilityRouter.get("/", asyncHandler(getAvailabilityController));
availabilityRouter.put(
  "/",
  validate(updateAvailabilitySchema),
  asyncHandler(replaceAvailabilityController)
);
