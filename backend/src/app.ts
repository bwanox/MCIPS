import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env, validateProductionEnvironment } from "./shared/config/env.js";
import { connectDatabase, type DatabaseState } from "./shared/infrastructure/database.js";
import { errorMiddleware } from "./shared/presentation/error-middleware.js";
import { notFoundMiddleware } from "./shared/presentation/not-found-middleware.js";
import { AlertMemoryRepository } from "./modules/alerts/infrastructure/repositories/alert-memory.repository.js";
import { EventLogMemoryRepository } from "./modules/events/infrastructure/repositories/event-log-memory.repository.js";
import { AlertMongoRepository } from "./modules/alerts/infrastructure/repositories/alert-mongo.repository.js";
import { EventLogMongoRepository } from "./modules/events/infrastructure/repositories/event-log-mongo.repository.js";
import { IncidentMemoryRepository } from "./modules/incidents/infrastructure/repositories/incident-memory.repository.js";
import { IncidentMongoRepository } from "./modules/incidents/infrastructure/repositories/incident-mongo.repository.js";
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
import { IncidentService } from "./modules/incidents/application/services/incident.service.js";
import { createIncidentRoutes } from "./modules/incidents/presentation/routes/incidents.routes.js";
import { EmailNotificationService } from "./modules/notifications/application/services/email-notification.service.js";
import { AgentClientService } from "./modules/agent/application/services/agent-client.service.js";
import { CopilotService } from "./modules/copilot/application/services/copilot.service.js";
import { createCopilotRoutes } from "./modules/copilot/presentation/routes/copilot.routes.js";
import type { AppSocketServer } from "./shared/config/socket.js";
import { CollectorCredentialMemoryRepository } from "./modules/collectors/infrastructure/repositories/collector-credential-memory.repository.js";
import { CollectorCredentialMongoRepository } from "./modules/collectors/infrastructure/repositories/collector-credential-mongo.repository.js";
import { CollectorAuthService } from "./modules/collectors/application/services/collector-auth.service.js";

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
  validateProductionEnvironment();
  const app = express();
  const databaseState = await connectDatabase();
  const alertsRepository =
    databaseState.mode === "mongo" ? new AlertMongoRepository() : new AlertMemoryRepository();
  const eventLogsRepository =
    databaseState.mode === "mongo" ? new EventLogMongoRepository() : new EventLogMemoryRepository();
  const incidentsRepository =
    databaseState.mode === "mongo" ? new IncidentMongoRepository() : new IncidentMemoryRepository();
  const collectorCredentialRepository =
    databaseState.mode === "mongo"
      ? new CollectorCredentialMongoRepository()
      : new CollectorCredentialMemoryRepository();
  const collectorAuthService = new CollectorAuthService(collectorCredentialRepository);
  await collectorAuthService.ensureBootstrapCredential();
  const statsService = new StatsService(alertsRepository);
  const aiInferenceService = new AiInferenceService();
  const emailNotificationService = new EmailNotificationService();
  const agentClientService = new AgentClientService();
  const incidentService = new IncidentService(
    incidentsRepository,
    aiInferenceService,
    emailNotificationService,
    agentClientService,
    io
  );
  const copilotService = new CopilotService(incidentService, aiInferenceService);
  const pipeline = new IngestionPipelineService(
    alertsRepository,
    eventLogsRepository,
    statsService,
    aiInferenceService,
    incidentService,
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
  app.use(express.json({ limit: "256kb" }));
  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax
    })
  );

  app.get("/health", async (_request, response) => {
    const agentStatus = await agentClientService.getStatus();
    response.json({
      backend: "ok",
      aiUrl: env.aiServiceUrl,
      agentUrl: env.agentApiUrl,
      agent: agentStatus,
      dbMode: databaseState.mode,
      databaseConnected: databaseState.connected,
      databaseError: databaseState.error,
      timestamp: new Date().toISOString()
    });
  });

  app.use("/api/auth", createAuthRoutes(authService));
  app.use("/api/events", createEventsRoutes(pipeline, authService, collectorAuthService, eventLogsRepository));
  app.use("/api/alerts", createAlertsRoutes(alertsRepository, authService));
  app.use("/api/stats", createStatsRoutes(statsService, authService));
  app.use("/api/simulation", createSimulationRoutes(simulationService, authService));
  app.use("/api/incidents", createIncidentRoutes(incidentService, authService));
  app.use("/api/copilot", createCopilotRoutes(copilotService, incidentService, authService));

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
