import { Router, type Request } from "express";

import type { IngestionPipelineService } from "../../application/services/ingestion-pipeline.service.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";
import { eventTypeSchemas, supportedEventTypes } from "../../application/validators/event.schema.js";
import type { AuthService } from "../../../auth/application/services/auth.service.js";
import type { CollectorAuthService } from "../../../collectors/application/services/collector-auth.service.js";
import { HttpError } from "../../../../shared/presentation/error-middleware.js";
import type { EventLogRepository } from "../../domain/event-log.repository.js";
import { authMiddleware, type AuthenticatedRequest } from "../../../../shared/presentation/auth-middleware.js";
import { paginationQuerySchema } from "../../../../shared/presentation/pagination.js";

export const createEventsRoutes = (
  pipeline: IngestionPipelineService,
  authService: AuthService,
  collectorAuthService: CollectorAuthService,
  eventLogsRepository: EventLogRepository
): Router => {
  const router = Router();

  const resolveIdentity = async (request: Request) => {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith("Bearer ")) {
      const user = authService.verify(authorization.slice("Bearer ".length));
      return {
        tenantId: user.tenantId,
        sourceAdapter: "manual-ui",
        source: "manual" as const,
        allowAgentMetadata: false
      };
    }

    const collectorKey = request.header("X-Collector-Key") ?? "";
    const collector = await collectorAuthService.authenticate(collectorKey);
    if (!collector || !collector.scopes.includes("events:write")) {
      throw new HttpError(401, "Valid user or collector credentials are required");
    }

    return {
      tenantId: collector.tenantId,
      sourceAdapter: collector.adapter,
      source: "external" as const,
      allowAgentMetadata: true
    };
  };

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const alert = await pipeline.ingest(request.body, await resolveIdentity(request));
      response.status(201).json(alert);
    })
  );

  router.post(
    "/batch",
    asyncHandler(async (request, response) => {
      const alerts = await pipeline.ingestBatch(request.body, await resolveIdentity(request));
      response.status(201).json(alerts);
    })
  );

  router.get(
    "/logs",
    authMiddleware(authService),
    asyncHandler(async (request: AuthenticatedRequest, response) => {
      const query = paginationQuerySchema.parse(request.query);
      response.json(await eventLogsRepository.paginate(request.user!.tenantId, query.page, query.limit));
    })
  );

  router.get(
    "/types",
    asyncHandler(async (_request, response) => {
      response.json({
        supportedEventTypes,
        schemas: eventTypeSchemas
      });
    })
  );

  return router;
};
