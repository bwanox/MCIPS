import type { NextFunction, Request, Response } from "express";

import type { AuthService, AuthUser } from "../../modules/auth/application/services/auth.service.js";
import { HttpError } from "./error-middleware.js";

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authMiddleware =
  (authService: AuthService) =>
  (request: AuthenticatedRequest, _response: Response, next: NextFunction): void => {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      next(new HttpError(401, "Missing bearer token"));
      return;
    }

    request.user = authService.verify(authorization.slice("Bearer ".length));
    next();
  };
