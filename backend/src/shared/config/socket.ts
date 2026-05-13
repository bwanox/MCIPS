import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import { env } from "./env.js";

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

export const createSocketServer = (server: HttpServer): AppSocketServer =>
  new SocketIOServer(server, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin ?? "unknown"} is not allowed by CORS`));
      },
      methods: ["GET", "POST"]
    }
  });
