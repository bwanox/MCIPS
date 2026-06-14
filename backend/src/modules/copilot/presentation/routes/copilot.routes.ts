import { Router } from "express";
import { z } from "zod";

import type { CopilotService } from "../../application/services/copilot.service.js";
import type { IncidentService } from "../../../incidents/application/services/incident.service.js";
import type { AuthService } from "../../../auth/application/services/auth.service.js";
import { authMiddleware } from "../../../../shared/presentation/auth-middleware.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";
import type { AuthenticatedRequest } from "../../../../shared/presentation/auth-middleware.js";
import { paginationQuerySchema } from "../../../../shared/presentation/pagination.js";
import { HttpError } from "../../../../shared/presentation/error-middleware.js";

const querySchema = z.object({
  incidentId: z.string().trim().min(1),
  question: z.string().trim().min(1).max(2_000)
});

export const createCopilotRoutes = (
  copilotService: CopilotService,
  incidentService: IncidentService,
  authService: AuthService
): Router => {
  const router = Router();
  router.use(authMiddleware(authService));

  router.get(
    "/feed",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const query = paginationQuerySchema.parse(request.query);
      response.json(await incidentService.listFeed(request.user!.tenantId, query.page, query.limit));
    })
  );

  router.post(
    "/query",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const payload = querySchema.parse(request.body);
      const incident = await incidentService.findById(payload.incidentId);
      if (!incident || incident.tenantId !== request.user!.tenantId) {
        throw new HttpError(404, "Incident not found");
      }
      response.json(await copilotService.answerIncidentQuestion(payload.incidentId, payload.question));
    })
  );

  return router;
};
