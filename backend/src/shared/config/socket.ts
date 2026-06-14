import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";

import { env } from "./env.js";
import type { AuthUser } from "../../modules/auth/application/services/auth.service.js";

export type AppSocketServer = SocketIOServer;

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

export const createSocketServer = (server: HttpServer): AppSocketServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        console.warn(`[Socket.IO] Origin ${origin ?? "unknown"} blocked by CORS`);
        callback(new Error(`Origin ${origin ?? "unknown"} is not allowed by CORS`));
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  io.use((socket, next) => {
    const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : "";
    if (!token) {
      console.warn("[Socket.IO] Connection rejected: Missing token");
      next(new Error("Authentication required"));
      return;
    }

    if (!env.jwtSecret) {
      console.error("[Socket.IO] Connection rejected: JWT_SECRET not configured");
      next(new Error("Server configuration error"));
      return;
    }

    try {
      const user = jwt.verify(token, env.jwtSecret) as AuthUser;
      socket.data.user = user;
      next();
    } catch (error) {
      console.warn(`[Socket.IO] Connection rejected: Invalid token - ${error instanceof Error ? error.message : "Unknown error"}`);
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthUser;
    console.log(`[Socket.IO] Client connected: ${user.email} (Tenant: ${user.tenantId})`);
    void socket.join(`tenant:${user.tenantId}`);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${user.email} - Reason: ${reason}`);
    });
  });

  return io;
};
