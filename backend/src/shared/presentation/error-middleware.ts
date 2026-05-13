import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export const errorMiddleware = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Validation failed",
      errors: error.flatten()
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      message: error.message,
      details: error.details
    });
    return;
  }

  response.status(500).json({
    message: error instanceof Error ? error.message : "Internal server error"
  });
};
