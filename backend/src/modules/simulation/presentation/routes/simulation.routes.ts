import { Router } from "express";

import type { AuthService } from "../../../auth/application/services/auth.service.js";
import type { SimulationService } from "../../application/services/simulation.service.js";
import { authMiddleware } from "../../../../shared/presentation/auth-middleware.js";
import { asyncHandler } from "../../../../shared/utils/async-handler.js";

export const createSimulationRoutes = (
  simulationService: SimulationService,
  authService: AuthService
): Router => {
  const router = Router();

  router.use(authMiddleware(authService));

  router.post(
    "/start",
    asyncHandler(async (_request, response) => {
      response.json(simulationService.start());
    })
  );

  router.post(
    "/stop",
    asyncHandler(async (_request, response) => {
      response.json(simulationService.stop());
    })
  );

  router.get(
    "/status",
    asyncHandler(async (_request, response) => {
      response.json(simulationService.getStatus());
    })
  );

  router.post(
    "/once",
    asyncHandler(async (_request, response) => {
      response.status(201).json(await simulationService.runOnce());
    })
  );

  return router;
};
