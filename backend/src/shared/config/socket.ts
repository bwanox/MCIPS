import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import { env } from "./env.js";

export type AppSocketServer = SocketIOServer;

export const createSocketServer = (server: HttpServer): AppSocketServer =>
  new SocketIOServer(server, {
    cors: {
      origin: env.clientUrl,
      methods: ["GET", "POST"]
    }
  });
