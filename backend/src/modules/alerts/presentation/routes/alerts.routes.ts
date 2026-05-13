import { Router } from "express";

import type { AlertRepository } from "../../domain/alert.repository.js";
import type { AuthService } from "../../../auth/application/services/auth.service.js";
import { authMiddleware } from "../../../../shared/presentation/auth-middleware.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";
import { HttpError } from "../../../../shared/presentation/error-middleware.js";

export const createAlertsRoutes = (alertsRepository: AlertRepository, authService: AuthService): Router => {
  const router = Router();
  const requireAuth = authMiddleware(authService);

  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      response.json(await alertsRepository.list());
    })
  );

  router.get(
    "/recent",
    asyncHandler(async (_request, response) => {
      const alerts = await alertsRepository.list();
      response.json(alerts.slice(0, 10));
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (request, response) => {
      const alertId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
      const alert = await alertsRepository.findById(alertId);
      if (!alert) {
        throw new HttpError(404, "Alert not found");
      }

      response.json(alert);
    })
  );

  return router;
};
