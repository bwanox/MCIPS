import { Router } from "express";

import type { IngestionPipelineService } from "../../application/services/ingestion-pipeline.service.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";
import { eventTypeSchemas, supportedEventTypes } from "../../application/validators/event.schema.js";

export const createEventsRoutes = (pipeline: IngestionPipelineService): Router => {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const alert = await pipeline.ingest(request.body);
      response.status(201).json(alert);
    })
  );

  router.post(
    "/batch",
    asyncHandler(async (request, response) => {
      const alerts = await pipeline.ingestBatch(request.body);
      response.status(201).json(alerts);
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
