import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn()
  }
}));

describe("MCIPS backend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.USE_IN_MEMORY_DB = "true";
    process.env.ADMIN_EMAIL = "admin@mcips.local";
  });

  it("returns health metadata", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.backend).toBe("ok");
    expect(response.body.dbMode).toBe("memory");
    expect(response.body.timestamp).toBeTypeOf("string");
  });

  it("creates an alert through the ingestion pipeline", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const axios = await import("axios");
    vi.mocked(axios.default.post).mockResolvedValueOnce({
      data: {
        label: "phishing",
        confidence: 0.93,
        risk: "HIGH",
        explanation: "Contains credential theft indicators",
        features: ["credential_request", "urgent_language"],
        model_used: "hybrid_ai_v1",
        fallback_used: false
      }
    });

    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const response = await request(app).post("/api/events").send({
      type: "EMAIL",
      source: "manual",
      content: "Contact john@bank.com and use OTP 123456 to unlock account 123456789012"
    });

    expect(response.status).toBe(201);
    expect(response.body.label).toBe("phishing");
    expect(response.body.severity).toBe("critical");
    expect(response.body.sanitizedPreview).toContain("[EMAIL]");
    expect(response.body.piiDetected).toBe(true);
  });

  it("falls back when the AI service fails", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const axios = await import("axios");
    vi.mocked(axios.default.post).mockImplementation(async () => {
      throw new Error("timeout");
    });

    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const response = await request(app).post("/api/events").send({
      type: "TEXT",
      source: "external",
      content: "Suspicious text"
    });

    expect(response.status).toBe(201);
    expect(response.body.label).toBe("suspicious");
    expect(response.body.fallbackUsed).toBe(true);
  });

  it("protects secured routes", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const response = await request(app).get("/api/alerts");

    expect(response.status).toBe(401);
  });

  it("aggregates stats and simulation once", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const axios = await import("axios");
    vi.mocked(axios.default.post).mockResolvedValue({
      data: {
        label: "suspicious_login",
        confidence: 0.8,
        risk: "HIGH",
        explanation: "New device and velocity mismatch",
        features: ["new_device", "geo_velocity"],
        model_used: "hybrid_ai_v1",
        fallback_used: false
      }
    });

    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const login = await request(app).post("/api/auth/login").send({
      email: "admin@mcips.local",
      password: "admin123"
    });
    const token = login.body.token;

    const onceResponse = await request(app)
      .post("/api/simulation/once")
      .set("Authorization", `Bearer ${token}`);

    const summaryResponse = await request(app)
      .get("/api/stats/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(onceResponse.status).toBe(201);
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.totalAlerts).toBeGreaterThan(0);
    expect(summaryResponse.body.suspiciousLoginCount).toBeGreaterThan(0);
    expect(Array.isArray(summaryResponse.body.recentAlerts)).toBe(true);
  });
});
