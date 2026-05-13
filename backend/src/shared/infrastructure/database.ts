import mongoose from "mongoose";

import { env } from "../config/env.js";

export type DatabaseMode = "memory" | "mongo";

export interface DatabaseState {
  connected: boolean;
  mode: DatabaseMode;
  error?: string;
}

export const connectDatabase = async (): Promise<DatabaseState> => {
  if (env.useInMemoryDb) {
    return { connected: true, mode: "memory" };
  }

  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 3_000
    });

    return { connected: true, mode: "mongo" };
  } catch (error) {
    return {
      connected: false,
      mode: "memory",
      error: error instanceof Error ? error.message : "Unknown database error"
    };
  }
};
