import { Router } from "express";
import { z } from "zod";

import type { AuthService } from "../../../auth/application/services/auth.service.js";
import type { StatsService } from "../../application/services/stats.service.js";
import { authMiddleware } from "../../../../shared/presentation/auth-middleware.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";
import type { AuthenticatedRequest } from "../../../../shared/presentation/auth-middleware.js";

const timelineQuerySchema = z.object({
  range: z.enum(["today", "week", "month"]).default("today")
});

export const createStatsRoutes = (statsService: StatsService, authService: AuthService): Router => {
  const router = Router();

  router.use(authMiddleware(authService));

  router.get(
    "/summary",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      response.json(await statsService.getSummary(request.user!.tenantId));
    })
  );

  router.get(
    "/timeline",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const query = timelineQuerySchema.parse(request.query);
      response.json(await statsService.getTimeline(query.range, request.user!.tenantId));
    })
  );

  return router;
};
