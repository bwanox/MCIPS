import type { AppSocketServer } from "../../../../shared/config/socket.js";
import type { AlertRecord, EventSource } from "../../../../shared/types/platform.js";
import type { IngestionPipelineService } from "../../../events/application/services/ingestion-pipeline.service.js";
import type { CyberEventEnvelope } from "../../../../types/cyberEvent.js";

interface SimulationStatus {
  running: boolean;
  intervalMs: number;
  lastAlertAt?: string;
}

const demoEvents: CyberEventEnvelope[] = [
  {
    eventId: "sim-sms-phishing",
    eventType: "sms.message.received",
    tenantId: "tenant-demo",
    eventTimestampUtc: new Date().toISOString(),
    source: "simulation",
    payload: {
      content: "Votre compte CIH est bloque. Cliquez ici https://bank.example pour verifier OTP 492911.",
      sender: "unknown"
    }
  },
  {
    eventId: "sim-sms-safe",
    eventType: "sms.message.received",
    tenantId: "tenant-demo",
    eventTimestampUtc: new Date().toISOString(),
    source: "simulation",
    payload: {
      content: "Package delivered successfully. Thank you for using MCIPS demo notifications.",
      sender: "delivery-service"
    }
  },
  {
    eventId: "sim-login",
    eventType: "auth.login.attempt",
    tenantId: "tenant-demo",
    eventTimestampUtc: new Date().toISOString(),
    source: "simulation",
    payload: {
      content: "Login attempt detected from unfamiliar device",
      ip_address: "192.0.2.44",
      country: "unknown",
      device: "unknown device",
      user_agent: "UnknownBot/1.0"
    }
  },
  {
    eventId: "sim-network-suspicious",
    eventType: "net.intrusion.suspected",
    tenantId: "tenant-demo",
    eventTimestampUtc: new Date().toISOString(),
    source: "simulation",
    payload: {
      protocol_type: "tcp",
      service: "http",
      flag: "SF",
      class: "neptune",
      difficulty_level: 15,
      src_bytes: 491,
      dst_bytes: 0,
      num_failed_logins: 5,
      root_shell: 1,
      num_compromised: 1,
      serror_rate: 0.8,
      rerror_rate: 0.1
    }
  },
  {
    eventId: "sim-network-safe",
    eventType: "net.intrusion.suspected",
    tenantId: "tenant-demo",
    eventTimestampUtc: new Date().toISOString(),
    source: "simulation",
    payload: {
      protocol_type: "tcp",
      service: "http",
      flag: "SF",
      class: "normal",
      difficulty_level: 5,
      src_bytes: 128,
      dst_bytes: 256,
      num_failed_logins: 0,
      root_shell: 0,
      num_compromised: 0,
      serror_rate: 0,
      rerror_rate: 0
    }
  },
  {
    eventId: "sim-log-anomaly",
    eventType: "log.anomaly.detected",
    tenantId: "tenant-demo",
    eventTimestampUtc: new Date().toISOString(),
    source: "simulation",
    payload: {
      timestamp: new Date().toISOString(),
      log_level: "ERROR",
      component: "auth-service",
      event_id: "EVT-4421",
      message: "Failed login attempt threshold exceeded for session ABC123XYZ",
      anomaly_score: 0.87,
      is_anomaly: 1
    }
  },
  {
    eventId: "sim-phishing-email",
    eventType: "phishing.email.detected",
    tenantId: "tenant-demo",
    eventTimestampUtc: new Date().toISOString(),
    source: "simulation",
    payload: {
      label: "Phishing Email",
      label_binary: 1,
      char_count: 1842,
      word_count: 312,
      url_count: 3,
      has_html: true,
      ml_score_phishing: 0.96,
      top_tokens: ["verify", "account"]
    }
  }
];

export class SimulationService {
  private timer?: NodeJS.Timeout;
  private readonly status: SimulationStatus = {
    running: false,
    intervalMs: 5_000
  };
  private nextIndex = 0;

  constructor(private readonly pipeline: IngestionPipelineService, private readonly io?: AppSocketServer) {}

  getStatus(): SimulationStatus {
    return { ...this.status };
  }

  async runOnce(): Promise<AlertRecord> {
    const event = demoEvents[this.nextIndex % demoEvents.length];
    this.nextIndex += 1;
    const alert = await this.pipeline.ingest(event);
    this.status.lastAlertAt = alert.timestamp;
    this.io?.emit("simulation:status", this.getStatus());
    this.io?.emit("system:status", {
      simulation: this.getStatus()
    });
    return alert;
  }

  start(intervalMs = 5_000): SimulationStatus {
    if (this.timer) {
      return this.getStatus();
    }

    this.status.running = true;
    this.status.intervalMs = intervalMs;
    this.timer = setInterval(() => {
      void this.runOnce();
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
