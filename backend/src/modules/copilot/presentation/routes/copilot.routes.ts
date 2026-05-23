import { Router } from "express";
import { z } from "zod";

import type { CopilotService } from "../../application/services/copilot.service.js";
import type { IncidentService } from "../../../incidents/application/services/incident.service.js";
import type { AuthService } from "../../../auth/application/services/auth.service.js";
import { authMiddleware } from "../../../../shared/presentation/auth-middleware.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";

const querySchema = z.object({
  incidentId: z.string().trim().min(1),
  question: z.string().trim().min(1)
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
    asyncHandler(async (_request, response) => {
      response.json(await incidentService.listFeed());
    })
  );

  router.post(
    "/query",
    asyncHandler(async (request, response) => {
      const payload = querySchema.parse(request.body);
      response.json(await copilotService.answerIncidentQuestion(payload.incidentId, payload.question));
    })
  );

  return router;
};
