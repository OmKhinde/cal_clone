import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { availabilityRouter } from "./routes/availability.routes.js";
import { bookingsRouter } from "./routes/bookings.routes.js";
import { eventTypesRouter } from "./routes/eventTypes.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { slotsRouter } from "./routes/slots.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.NODE_ENV === "production" ? env.FRONTEND_URL : true,
    credentials: true
  })
);
app.use(express.json());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/event-types", eventTypesRouter);
app.use("/api/public", publicRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/slots", slotsRouter);
app.use("/api/bookings", bookingsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
