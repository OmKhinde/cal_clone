import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { env } from "../config/env.js";

function getPrismaErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError("NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`, 404));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }

  const prismaCode = getPrismaErrorCode(error);

  if (prismaCode === "P2002") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "A unique constraint was violated."
        }
      });
  }

  if (prismaCode === "P2025") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Requested resource was not found."
        }
      });
  }

  const message = env.NODE_ENV === "production" ? "Internal server error" : formatUnknownError(error);

  console.error(`[${req.method} ${req.originalUrl}]`, error);

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message
    }
  });
}
