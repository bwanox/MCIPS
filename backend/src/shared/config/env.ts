import "dotenv/config";

const parseList = (value: string | undefined, defaultValue: string[]): string[] => {
  if (!value) {
    return defaultValue;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
};

const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) {
    return defaultValue;
  }

const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseNumber(process.env.PORT, 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:3000",
  clientUrls: parseList(process.env.CLIENT_URLS ?? process.env.CLIENT_URL, ["http://localhost:3000"]),
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000",
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@mcips.local",
  adminPasswordHash:
    process.env.ADMIN_PASSWORD_HASH ?? "$2a$10$f4HOvMKxaWVQ8wfIzISQHOrFJ2r93NyvIdokBwNrDPcNTQDPZEVg.",
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/mcips",
  useInMemoryDb: parseBoolean(process.env.USE_IN_MEMORY_DB, true),
  storeRawContent: parseBoolean(process.env.STORE_RAW_CONTENT, false),
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 120)
} as const;

export type AppEnv = typeof env;
