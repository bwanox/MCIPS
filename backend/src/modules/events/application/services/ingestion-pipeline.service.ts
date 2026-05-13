import { randomUUID } from "node:crypto";

import type { AlertRepository } from "../../../alerts/domain/alert.repository.js";
import type { EventLogRepository } from "../../domain/event-log.repository.js";
import type { AppSocketServer } from "../../../../shared/config/socket.js";
import type { AlertRecord, EventLogRecord } from "../../../../shared/types/platform.js";
import { alertEngine } from "../../../alerts/application/services/alert-engine.js";
import { AiInferenceService } from "./ai-inference.service.js";
import { privacySanitizer } from "./privacy-sanitizer.js";
import { eventSchema, type EventSchemaInput } from "../validators/event.schema.js";
import { StatsService } from "../../../stats/application/services/stats.service.js";

export class IngestionPipelineService {
  constructor(
    private readonly alertsRepository: AlertRepository,
    private readonly eventLogsRepository: EventLogRepository,
    private readonly statsService: StatsService,
    private readonly aiInferenceService: AiInferenceService,
    private readonly io?: AppSocketServer
  ) {}

  async ingest(rawInput: EventSchemaInput): Promise<AlertRecord> {
    const payload = eventSchema.parse(rawInput);
    const sanitized = privacySanitizer(payload.content);
    const inference = await this.aiInferenceService.analyze({
      ...payload,
      content: sanitized.sanitizedContent
    });

    const alert = alertEngine(
      {
        ...payload,
        content: sanitized.sanitizedContent
      },
      sanitized,
      inference
    );

    const eventLog: EventLogRecord = {
      id: randomUUID(),
      eventType: payload.type,
      source: payload.source,
      label: inference.label,
      risk: inference.risk,
      sanitizedPreview: sanitized.sanitizedPreview,
      piiDetected: sanitized.piiDetected,
      detectedBank: sanitized.detectedBank,
      fallbackUsed: inference.fallbackUsed,
      timestamp: alert.timestamp
    };

    await this.alertsRepository.create(alert);
    await this.eventLogsRepository.create(eventLog);

    const [summary] = await Promise.all([this.statsService.getSummary()]);

    this.io?.emit("alert:new", alert);
    this.io?.emit("stats:update", summary);

    return alert;
  }
}
