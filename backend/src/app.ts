import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./shared/config/env.js";
import { connectDatabase, type DatabaseState } from "./shared/infrastructure/database.js";
import { errorMiddleware } from "./shared/presentation/error-middleware.js";
import { notFoundMiddleware } from "./shared/presentation/not-found-middleware.js";
import { AlertMemoryRepository } from "./modules/alerts/infrastructure/repositories/alert-memory.repository.js";
import { EventLogMemoryRepository } from "./modules/events/infrastructure/repositories/event-log-memory.repository.js";
import { AlertMongoRepository } from "./modules/alerts/infrastructure/repositories/alert-mongo.repository.js";
import { EventLogMongoRepository } from "./modules/events/infrastructure/repositories/event-log-mongo.repository.js";
import { StatsService } from "./modules/stats/application/services/stats.service.js";
import { AiInferenceService } from "./modules/events/application/services/ai-inference.service.js";
import { IngestionPipelineService } from "./modules/events/application/services/ingestion-pipeline.service.js";
import { SimulationService } from "./modules/simulation/application/services/simulation.service.js";
import { AuthService } from "./modules/auth/application/services/auth.service.js";
import { createEventsRoutes } from "./modules/events/presentation/routes/events.routes.js";
import { createAlertsRoutes } from "./modules/alerts/presentation/routes/alerts.routes.js";
import { createStatsRoutes } from "./modules/stats/presentation/routes/stats.routes.js";
import { createSimulationRoutes } from "./modules/simulation/presentation/routes/simulation.routes.js";
import { createAuthRoutes } from "./modules/auth/presentation/routes/auth.routes.js";
import type { AppSocketServer } from "./shared/config/socket.js";

const isPrivateDevelopmentOrigin = (origin: string): boolean => {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;

    return (
      parsed.protocol.startsWith("http") &&
      (host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        /^10\.\d+\.\d+\.\d+$/.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host) ||
        /^192\.168\.\d+\.\d+$/.test(host))
    );
  } catch {
    return false;
  }
};

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }

  if (env.clientUrls.includes(origin)) {
    return true;
  }

  return env.nodeEnv !== "production" && isPrivateDevelopmentOrigin(origin);
};

export interface AppServices {
  databaseState: DatabaseState;
  simulationService: SimulationService;
  authService: AuthService;
}

export const createApp = async (io?: AppSocketServer): Promise<{ app: express.Express; services: AppServices }> => {
  const app = express();
  const databaseState = await connectDatabase();
  const alertsRepository =
    databaseState.mode === "mongo" ? new AlertMongoRepository() : new AlertMemoryRepository();
  const eventLogsRepository =
    databaseState.mode === "mongo" ? new EventLogMongoRepository() : new EventLogMemoryRepository();
  const statsService = new StatsService(alertsRepository);
  const aiInferenceService = new AiInferenceService();
  const pipeline = new IngestionPipelineService(
    alertsRepository,
    eventLogsRepository,
    statsService,
    aiInferenceService,
    io
  );
  const simulationService = new SimulationService(pipeline, io);
  const authService = new AuthService();

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin ?? "unknown"} is not allowed by CORS`));
      }
    })
  );
  app.use(helmet());
  app.use(express.json());
  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax
    })
  );

  app.get("/health", (_request, response) => {
    response.json({
      backend: "ok",
      aiUrl: env.aiServiceUrl,
      dbMode: databaseState.mode,
      databaseConnected: databaseState.connected,
      databaseError: databaseState.error,
      timestamp: new Date().toISOString()
    });
  });

  app.use("/api/auth", createAuthRoutes(authService));
  app.use("/api/events", createEventsRoutes(pipeline));
  app.use("/api/alerts", createAlertsRoutes(alertsRepository, authService));
  app.use("/api/stats", createStatsRoutes(statsService, authService));
  app.use("/api/simulation", createSimulationRoutes(simulationService, authService));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return {
    app,
    services: {
      databaseState,
      simulationService,
      authService
    }
  };
};
