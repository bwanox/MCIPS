import { createHash } from "node:crypto";

import type { AppSocketServer } from "../../../../shared/config/socket.js";
import type { AlertRecord, EventSource } from "../../../../shared/types/platform.js";
import type { IngestionPipelineService } from "../../../events/application/services/ingestion-pipeline.service.js";
import type { CyberEventEnvelope, SourceFamily } from "../../../../types/cyberEvent.js";

export interface SimulationStatus {
  running: boolean;
  intervalMs: number;
  scenario: DemoScenarioName;
  lastRunAt?: string;
  lastAlertAt?: string;
}

export interface ScenarioRunResult {
  scenario: DemoScenarioName;
  alerts: AlertRecord[];
  incidentId?: string;
  completedAt: string;
}

export type DemoScenarioName = "phishing-login";

const eventFamilyByType: Record<CyberEventEnvelope["eventType"], SourceFamily> = {
  "email.message.received": "email",
  "phishing.email.detected": "email",
  "sms.message.received": "messaging",
  "text.message.received": "messaging",
  "auth.login.attempt": "login",
  "log.anomaly.detected": "system",
  "net.intrusion.suspected": "system"
};

const withSimulationMetadata = (event: Omit<CyberEventEnvelope, "sourceFamily" | "sourceAdapter" | "sourceRef" | "eventHash" | "occurredAt">): CyberEventEnvelope => {
  const sourceFamily = eventFamilyByType[event.eventType];
  const sourceAdapter = `simulation-${sourceFamily}`;
  const sourceRef = event.eventId;
  const occurredAt = event.eventTimestampUtc;

  return {
    ...event,
    sourceFamily,
    sourceAdapter,
    sourceRef,
    eventHash: createHash("sha256")
      .update(JSON.stringify({ eventType: event.eventType, tenantId: event.tenantId, sourceAdapter, sourceRef, payload: event.payload }))
      .digest("hex"),
    occurredAt
  };
};

const phishingSmsTemplate = withSimulationMetadata({
    eventId: "sim-sms-phishing",
    eventType: "sms.message.received",
    tenantId: "tenant-demo",
    eventTimestampUtc: "2025-01-15T14:23:44.998Z",
    source: "simulation",
    payload: {
      content: "Votre compte CIH est bloque. Confirmez votre OTP 492911 sur https://cih-verification.example maintenant.",
      sender: "CIH-urgent"
    }
  });

const suspiciousLoginTemplate = withSimulationMetadata({
    eventId: "sim-login",
    eventType: "auth.login.attempt",
    tenantId: "tenant-demo",
    eventTimestampUtc: "2025-01-15T14:25:14.998Z",
    source: "simulation",
    payload: {
      content: "Suspicious login attempt detected after CIH phishing lure",
      ip_address: "197.230.45.19",
      country: "MA-unknown",
      device: "new Android device",
      user_agent: "UnknownBot/1.0"
    }
  });

const cloneScenarioEvent = (
  template: CyberEventEnvelope,
  runId: string,
  occurredAt: string,
  eventIdSuffix: string
): CyberEventEnvelope =>
  withSimulationMetadata({
    ...template,
    eventId: `${template.eventId}-${runId}-${eventIdSuffix}`,
    eventTimestampUtc: occurredAt,
    payload: { ...template.payload }
  });

export class SimulationService {
  private timer?: NodeJS.Timeout;
  private readonly status: SimulationStatus = {
    running: false,
    intervalMs: 5_000,
    scenario: "phishing-login"
  };

  constructor(private readonly pipeline: IngestionPipelineService, private readonly io?: AppSocketServer) {}

  getStatus(): SimulationStatus {
    return { ...this.status };
  }

  async runOnce(): Promise<AlertRecord> {
    const result = await this.runScenario("phishing-login");
    const alert = result.alerts[result.alerts.length - 1]!;
    this.io?.emit("simulation:status", this.getStatus());
    this.io?.emit("system:status", {
      simulation: this.getStatus()
    });
    return alert;
  }

  async runScenario(scenario: DemoScenarioName = "phishing-login"): Promise<ScenarioRunResult> {
    const runId = `${Date.now()}`;
    const baseTime = new Date();
    const firstTime = new Date(baseTime.getTime()).toISOString();
    const secondTime = new Date(baseTime.getTime() + 2 * 60 * 1000).toISOString();

    const events =
      scenario === "phishing-login"
        ? [
            cloneScenarioEvent(phishingSmsTemplate, runId, firstTime, "sms"),
            cloneScenarioEvent(suspiciousLoginTemplate, runId, secondTime, "login")
          ]
        : [];

    const alerts: AlertRecord[] = [];

    for (const event of events) {
      alerts.push(await this.pipeline.ingest(event));
    }

    const completedAt = new Date().toISOString();
    this.status.lastRunAt = completedAt;
    this.status.lastAlertAt = alerts[alerts.length - 1]?.timestamp;
    this.status.scenario = scenario;

    this.io?.emit("simulation:status", this.getStatus());
    this.io?.emit("system:status", {
      simulation: this.getStatus()
    });

    return {
      scenario,
      alerts,
      incidentId: alerts[alerts.length - 1]?.incidentId,
      completedAt
    };
  }

  start(intervalMs = 5_000): SimulationStatus {
    if (this.timer) {
      return this.getStatus();
    }

    this.status.running = true;
    this.status.intervalMs = intervalMs;
    this.timer = setInterval(() => {
      void this.runScenario(this.status.scenario);
    }, intervalMs);
    this.io?.emit("simulation:status", this.getStatus());
    this.io?.emit("system:status", {
      simulation: this.getStatus()
    });
    return this.getStatus();
  }

  stop(): SimulationStatus {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    this.status.running = false;
    this.io?.emit("simulation:status", this.getStatus());
    this.io?.emit("system:status", {
      simulation: this.getStatus()
    });
    return this.getStatus();
  }
}
