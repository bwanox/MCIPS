import type { Request, Response } from "express";

export const notFoundMiddleware = (request: Request, response: Response): void => {
  response.status(404).json({
    message: `Route ${request.method} ${request.path} not found`
  });
};
