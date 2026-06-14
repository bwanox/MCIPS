import { Router } from "express";
import { z } from "zod";

import type { IncidentService } from "../../application/services/incident.service.js";
import type { AuthService } from "../../../auth/application/services/auth.service.js";
import { authMiddleware } from "../../../../shared/presentation/auth-middleware.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";
import { HttpError } from "../../../../shared/presentation/error-middleware.js";
import type { AuthenticatedRequest } from "../../../../shared/presentation/auth-middleware.js";
import { paginationQuerySchema } from "../../../../shared/presentation/pagination.js";

const statusSchema = z.object({
  status: z.enum(["new", "investigating", "awaiting_approval", "contained", "resolved"])
});

export const createIncidentRoutes = (incidentService: IncidentService, authService: AuthService): Router => {
  const router = Router();
  router.use(authMiddleware(authService));
  const getParam = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : value ?? "");

  router.get(
    "/",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const query = paginationQuerySchema.parse(request.query);
      response.json(await incidentService.paginate(request.user!.tenantId, query.page, query.limit));
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const incident = await incidentService.findById(getParam(request.params.id));
      if (!incident || incident.tenantId !== request.user!.tenantId) {
        throw new HttpError(404, "Incident not found");
      }

      response.json(incident);
    })
  );

  router.get(
    "/:id/timeline",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const incident = await incidentService.findById(getParam(request.params.id));
      if (!incident || incident.tenantId !== request.user!.tenantId) {
        throw new HttpError(404, "Incident not found");
      }

      response.json(incident.timeline);
    })
  );

  router.patch(
    "/:id/status",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const payload = statusSchema.parse(request.body);
      const existing = await incidentService.findById(getParam(request.params.id));
      if (!existing || existing.tenantId !== request.user!.tenantId) {
        throw new HttpError(404, "Incident not found");
      }
      const incident = await incidentService.updateStatus(getParam(request.params.id), payload.status);
      if (!incident) {
        throw new HttpError(404, "Incident not found");
      }

      response.json(incident);
    })
  );

  router.post(
    "/:id/actions/:actionId/approve",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const existing = await incidentService.findById(getParam(request.params.id));
      if (!existing || existing.tenantId !== request.user!.tenantId) {
        throw new HttpError(404, "Incident not found");
      }
      const incident = await incidentService.approveAction(getParam(request.params.id), getParam(request.params.actionId));
      if (!incident) {
        throw new HttpError(404, "Incident not found");
      }

      response.json(incident);
    })
  );

  router.post(
    "/:id/actions/:actionId/reject",
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const existing = await incidentService.findById(getParam(request.params.id));
      if (!existing || existing.tenantId !== request.user!.tenantId) {
        throw new HttpError(404, "Incident not found");
      }
      const incident = await incidentService.rejectAction(getParam(request.params.id), getParam(request.params.actionId));
      if (!incident) {
        throw new HttpError(404, "Incident not found");
      }

      response.json(incident);
    })
  );

  return router;
};
