import { createServer } from "node:http";

import { createApp } from "./app.js";
import { env } from "./shared/config/env.js";
import { createSocketServer } from "./shared/config/socket.js";

const bootstrap = async (): Promise<void> => {
  const httpServer = createServer();
  const io = createSocketServer(httpServer);
  const { app, services } = await createApp(io);

  httpServer.on("request", app);

  io.to(`tenant:${env.adminTenantId}`).emit("system:status", {
    backend: "online",
    ai: env.aiServiceUrl,
    agent: env.agentApiUrl,
    database: services.databaseState.mode,
    simulation: services.simulationService.getStatus()
  });

  httpServer.listen(env.port, () => {
    console.log(`MCIPS backend listening on ${env.port}`);
  });
};

void bootstrap();
