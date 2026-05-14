import { randomUUID } from "node:crypto";

import type { AlertRepository } from "../../../alerts/domain/alert.repository.js";
import type { EventLogRepository } from "../../domain/event-log.repository.js";
import type { AppSocketServer } from "../../../../shared/config/socket.js";
import type { AlertRecord, EventLogRecord } from "../../../../shared/types/platform.js";
import { alertEngine } from "../../../alerts/application/services/alert-engine.js";
import { AiInferenceService } from "./ai-inference.service.js";
import { privacySanitizer } from "./privacy-sanitizer.js";
import { parseIncomingCyberEvent, parseIncomingCyberEventBatch } from "../validators/event.schema.js";
import { StatsService } from "../../../stats/application/services/stats.service.js";
import { isStructuredDatasetEvent, scoreDatasetEvent } from "../../../../services/datasetScoring.service.js";
import { enrichAlertWithIncidentCorrelation } from "../../../../services/incidentCorrelation.service.js";

export class IngestionPipelineService {
  constructor(
    private readonly alertsRepository: AlertRepository,
    private readonly eventLogsRepository: EventLogRepository,
    private readonly statsService: StatsService,
    private readonly aiInferenceService: AiInferenceService,
    private readonly io?: AppSocketServer
  ) {}

  async ingest(rawInput: unknown): Promise<AlertRecord> {
    const event = parseIncomingCyberEvent(rawInput);
    const sanitized = privacySanitizer(event);
    const priorAlerts = await this.alertsRepository.list();
    const inference =
      isStructuredDatasetEvent(event.eventType) && scoreDatasetEvent(event)
        ? scoreDatasetEvent({
            ...event,
            payload: sanitized.sanitizedPayload
          })
        : await this.aiInferenceService.analyze(
            {
              ...event,
              payload: sanitized.sanitizedPayload
            },
            sanitized
          );

    const alert = enrichAlertWithIncidentCorrelation({
      draftAlert: alertEngine(
        {
          ...event,
          payload: sanitized.sanitizedPayload
        },
        sanitized,
        inference!
      ),
      event,
      sanitized,
      priorAlerts
    });

    const eventLog: EventLogRecord = {
      id: randomUUID(),
      incidentId: alert.incidentId,
      eventId: event.eventId,
      tenantId: event.tenantId,
      eventType: event.eventType,
      datasetFamily: alert.datasetFamily,
      source: event.source,
      contentLength: sanitized.contentLength,
      label: inference!.label,
      risk: inference!.risk,
      sanitizedPreview: sanitized.sanitizedPreview,
      piiDetected: sanitized.piiDetected,
      detectedBank: sanitized.detectedBank,
      sanitizedPayload: sanitized.sanitizedPayload,
      modelUsed: inference!.modelUsed,
      fallbackUsed: inference!.fallbackUsed,
      timestamp: alert.timestamp
    };

    await this.alertsRepository.create(alert);
    await this.eventLogsRepository.create(eventLog);

    const [summary] = await Promise.all([this.statsService.getSummary()]);

    this.io?.emit("alert:new", alert);
    this.io?.emit("stats:update", summary);

    return alert;
  }

  async ingestBatch(rawInput: unknown): Promise<AlertRecord[]> {
    const events = parseIncomingCyberEventBatch(rawInput);
    const alerts: AlertRecord[] = [];

    for (const event of events) {
      alerts.push(await this.ingest(event));
    }

    return alerts;
  }
}
