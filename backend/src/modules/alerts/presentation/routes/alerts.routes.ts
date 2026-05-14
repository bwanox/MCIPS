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

  router.get(
    "/:id/export",
    asyncHandler(async (request, response) => {
      const alertId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
      const alert = await alertsRepository.findById(alertId);
      if (!alert) {
        throw new HttpError(404, "Alert not found");
      }

      response.json({
        project: "MCIPS SecureLens",
        generatedAt: new Date().toISOString(),
        incidentId: alert.incidentId,
        incidentType: alert.incidentType,
        title: alert.title,
        summary: alert.incidentSummary,
        tenantId: alert.tenantId,
        severity: alert.severity,
        risk: alert.risk,
        explainableRisk: alert.explainableRisk,
        correlatedSignals: alert.correlatedSignals,
        recommendedActions: alert.recommendedActions,
        detection: {
          eventId: alert.eventId,
          eventType: alert.eventType,
          datasetFamily: alert.datasetFamily,
          label: alert.label,
          confidence: alert.confidence,
          modelUsed: alert.modelUsed,
          fallbackUsed: alert.fallbackUsed
        },
        privacy: {
          sanitizedPreview: alert.sanitizedPreview,
          piiDetected: alert.piiDetected,
          detectedBank: alert.detectedBank,
          note: "Raw sensitive content is excluded from the export artifact by design."
        },
        payloadSummary: alert.payloadSummary
      });
    })
  );

  return router;
};
