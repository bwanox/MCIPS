import { Router } from "express";
import { z } from "zod";

import type { AuthService } from "../../application/services/auth.service.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";
import { authMiddleware, type AuthenticatedRequest } from "../../../../shared/presentation/auth-middleware.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const createAuthRoutes = (authService: AuthService): Router => {
  const router = Router();
  const requireAuth = authMiddleware(authService);

  router.post(
    "/login",
    asyncHandler(async (request, response) => {
      const payload = loginSchema.parse(request.body);
      const result = await authService.login(payload.email, payload.password);
      response.json(result);
    })
  );

  router.get(
    "/me",
    requireAuth,
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      response.json({ user: request.user });
    })
  );

  router.post(
    "/logout",
    requireAuth,
    asyncHandler(async (_request, response) => {
      response.json({ success: true });
    })
  );

  return router;
};
