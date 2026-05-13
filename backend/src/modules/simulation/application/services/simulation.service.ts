import type { AppSocketServer } from "../../../../shared/config/socket.js";
import type { AlertRecord, EventSource, EventType } from "../../../../shared/types/platform.js";
import type { IngestionPipelineService } from "../../../events/application/services/ingestion-pipeline.service.js";

interface SimulationStatus {
  running: boolean;
  intervalMs: number;
  lastAlertAt?: string;
}

const demoEvents: Array<{ type: EventType; content: string; source: EventSource }> = [
  {
    type: "EMAIL",
    source: "simulation",
    content: "Attijariwafa Bank urgent notice. Confirm OTP 492911 at https://secure-bank.example now."
  },
  {
    type: "SMS",
    source: "simulation",
    content: "Your account 123456789012 is blocked. Call +212612345678 to avoid closure."
  },
  {
    type: "LOGIN_ATTEMPT",
    source: "simulation",
    content: "Multiple login attempts detected for Mr Karim from new device in Casablanca."
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
