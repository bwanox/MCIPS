import { Router } from "express";

import type { IngestionPipelineService } from "../../application/services/ingestion-pipeline.service.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";

export const createEventsRoutes = (pipeline: IngestionPipelineService): Router => {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const alert = await pipeline.ingest(request.body);
      response.status(201).json(alert);
    })
  );

  return router;
};
