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
    expect(response.body.eventType).toBe("email.message.received");
    expect(response.body.sanitizedPreview).toContain("[EMAIL]");
    expect(response.body.piiDetected).toBe(true);
  });

  it("keeps old SMS format backward compatible", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const axios = await import("axios");
    vi.mocked(axios.default.post).mockResolvedValueOnce({
      data: {
        label: "scam",
        confidence: 0.78,
        risk: "MEDIUM",
        explanation: "Urgent account lock language detected",
        features: ["urgent_language"],
        model_used: "hybrid_ai_v1",
        fallback_used: false
      }
    });

    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const response = await request(app).post("/api/events").send({
      type: "SMS",
      source: "manual",
      content: "Votre compte CIH est bloque. Cliquez ici maintenant."
    });

    expect(response.status).toBe(201);
    expect(response.body.eventType).toBe("sms.message.received");
    expect(response.body.datasetFamily).toBe("sms_threat");
  });

  it("accepts the new SMS event envelope", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const axios = await import("axios");
    vi.mocked(axios.default.post).mockResolvedValueOnce({
      data: {
        label: "phishing",
        confidence: 0.91,
        risk: "HIGH",
        explanation: "Credential harvesting indicators detected",
        features: ["credential_request"],
        model_used: "hybrid_ai_v1",
        fallback_used: false
      }
    });

    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const response = await request(app).post("/api/events").send({
      event_id: "uuid-001",
      event_type: "sms.message.received",
      tenant_id: "tenant-acme-corp",
      event_timestamp_utc: "2025-01-15T14:23:44.998Z",
      source: "manual",
      payload: {
        content: "Your account is blocked, click https://example.test now"
      }
    });

    expect(response.status).toBe(201);
    expect(response.body.eventId).toBe("uuid-001");
    expect(response.body.tenantId).toBe("tenant-acme-corp");
    expect(response.body.eventType).toBe("sms.message.received");
  });

  it("scores structured network intrusion events locally without AI", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const axios = await import("axios");
    vi.mocked(axios.default.post).mockReset();

    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const response = await request(app).post("/api/events").send({
      event_type: "net.intrusion.suspected",
      source: "dataset",
      payload: {
        protocol_type: "tcp",
        service: "http",
        flag: "SF",
        class: "neptune",
        difficulty_level: 15,
        num_failed_logins: 5,
        root_shell: 1,
        num_compromised: 1,
        serror_rate: 0.8
      }
    });

    expect(response.status).toBe(201);
    expect(response.body.label).toBe("network_intrusion");
    expect(response.body.datasetFamily).toBe("network_intrusion");
    expect(response.body.modelUsed).toBe("dataset_scoring_v1");
    expect(vi.mocked(axios.default.post)).not.toHaveBeenCalled();
  });

  it("creates a HIGH log anomaly alert from structured data", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const response = await request(app).post("/api/events").send({
      event_type: "log.anomaly.detected",
      source: "dataset",
      payload: {
        timestamp: "2025-01-15T14:23:44.998Z",
        log_level: "ERROR",
        component: "auth-service",
        message: "Failed login threshold exceeded for user admin@example.com",
        anomaly_score: 0.87,
        is_anomaly: 1
      }
    });

    expect(response.status).toBe(201);
    expect(response.body.label).toBe("log_anomaly");
    expect(response.body.risk).toBe("HIGH");
    expect(response.body.severity).toBe("critical");
  });

  it("creates a HIGH phishing email alert and never returns raw email text", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const ingestResponse = await request(app).post("/api/events").send({
      event_type: "phishing.email.detected",
      source: "dataset",
      payload: {
        email_text: "Verify your account at https://bank.example immediately",
        label: "Phishing Email",
        label_binary: 1,
        ml_score_phishing: 0.96,
        url_count: 3,
        has_html: true
      }
    });

    expect(ingestResponse.status).toBe(201);
    expect(ingestResponse.body.label).toBe("phishing");
    expect(ingestResponse.body.risk).toBe("HIGH");

    const login = await request(app).post("/api/auth/login").send({
      email: "admin@mcips.local",
      password: "admin123"
    });
    const token = login.body.token;

    const alertsResponse = await request(app)
      .get("/api/alerts")
      .set("Authorization", `Bearer ${token}`);

    expect(alertsResponse.status).toBe(200);
    expect(JSON.stringify(alertsResponse.body)).not.toContain("Verify your account at https://bank.example immediately");
    expect(JSON.stringify(alertsResponse.body)).toContain("email_text_hash");
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
    expect(Array.isArray(summaryResponse.body.datasetFamilyDistribution)).toBe(true);
    expect(Array.isArray(summaryResponse.body.recentAlerts)).toBe(true);
  });

  it("can simulate all supported event families across multiple runs", async () => {
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

    for (let index = 0; index < 7; index += 1) {
      await request(app).post("/api/simulation/once").set("Authorization", `Bearer ${token}`);
    }

    const alertsResponse = await request(app)
      .get("/api/alerts")
      .set("Authorization", `Bearer ${token}`);

    const families = new Set(alertsResponse.body.map((alert: { datasetFamily: string }) => alert.datasetFamily));
    expect(families.has("sms_threat")).toBe(true);
    expect(families.has("auth_security")).toBe(true);
    expect(families.has("network_intrusion")).toBe(true);
    expect(families.has("logging_monitoring")).toBe(true);
    expect(families.has("phishing_email")).toBe(true);
  });

  it("correlates phishing and suspicious login into a higher-severity incident and exports it", async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
    const axios = await import("axios");
    vi.mocked(axios.default.post)
      .mockResolvedValueOnce({
        data: {
          label: "phishing",
          confidence: 0.92,
          risk: "MEDIUM",
          explanation: "Credential lure with urgent bank language",
          features: ["otp_request", "credential_request"],
          model_used: "hybrid_ai_v1",
          fallback_used: false
        }
      })
      .mockResolvedValueOnce({
        data: {
          label: "suspicious_login",
          confidence: 0.82,
          risk: "MEDIUM",
          explanation: "New device and unknown access context",
          features: ["new_device", "ip_anomaly"],
          model_used: "hybrid_ai_v1",
          fallback_used: false
        }
      });

    const { createApp } = await import("../app.js");
    const { app } = await createApp();

    const phishingResponse = await request(app).post("/api/events").send({
      event_type: "sms.message.received",
      tenant_id: "tenant-correlation",
      source: "manual",
      payload: {
        content: "Votre compte CIH est bloque. Confirmez OTP 492911 sur https://cih-secure.example"
      }
    });

    const loginResponse = await request(app).post("/api/events").send({
      event_type: "auth.login.attempt",
      tenant_id: "tenant-correlation",
      source: "manual",
      payload: {
        content: "Suspicious login attempt",
        ip_address: "192.0.2.44",
        country: "unknown",
        device: "unknown device",
        user_agent: "UnknownBot/1.0"
      }
    });

    expect(phishingResponse.status).toBe(201);
    expect(loginResponse.status).toBe(201);
    expect(loginResponse.body.correlationDetected).toBe(true);
    expect(loginResponse.body.severity).toBe("critical");
    expect(loginResponse.body.explainableRisk.finalScore).toBeGreaterThanOrEqual(75);
    expect(loginResponse.body.recommendedActions.length).toBeGreaterThan(0);

    const login = await request(app).post("/api/auth/login").send({
      email: "admin@mcips.local",
      password: "admin123"
    });
    const token = login.body.token;

    const exportResponse = await request(app)
      .get(`/api/alerts/${loginResponse.body.id}/export`)
      .set("Authorization", `Bearer ${token}`);

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.body.project).toBe("MCIPS SecureLens");
    expect(exportResponse.body.incidentId).toBeTruthy();
    expect(Array.isArray(exportResponse.body.recommendedActions)).toBe(true);
    expect(JSON.stringify(exportResponse.body)).not.toContain("Votre compte CIH est bloque");
  });
});
