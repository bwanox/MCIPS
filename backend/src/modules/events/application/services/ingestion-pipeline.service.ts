import { createHash, randomUUID } from "node:crypto";

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
import type { IncidentService } from "../../../incidents/application/services/incident.service.js";
import { env } from "../../../../shared/config/env.js";

export interface EventIngestionIdentity {
  tenantId: string;
  sourceAdapter: string;
  source: "manual" | "external";
  allowAgentMetadata: boolean;
}

const sourceFamilyByEventType = {
  "email.message.received": "email",
  "phishing.email.detected": "email",
  "sms.message.received": "messaging",
  "text.message.received": "messaging",
  "auth.login.attempt": "login",
  "log.anomaly.detected": "system",
  "net.intrusion.suspected": "system"
} as const;

export class IngestionPipelineService {
  constructor(
    private readonly alertsRepository: AlertRepository,
    private readonly eventLogsRepository: EventLogRepository,
    private readonly statsService: StatsService,
    private readonly aiInferenceService: AiInferenceService,
    private readonly incidentService: IncidentService,
    private readonly io?: AppSocketServer
  ) {}

  async ingest(rawInput: unknown, identity?: EventIngestionIdentity): Promise<AlertRecord> {
    const parsedEvent = parseIncomingCyberEvent(rawInput);
    const event = identity
      ? {
          ...parsedEvent,
          tenantId: identity.tenantId,
          source: identity.source,
          sourceFamily: sourceFamilyByEventType[parsedEvent.eventType],
          sourceAdapter: identity.sourceAdapter,
          agentHints: identity.allowAgentMetadata ? parsedEvent.agentHints : undefined,
          localRiskSignals: identity.allowAgentMetadata ? parsedEvent.localRiskSignals : undefined,
          collectorConfidence: identity.allowAgentMetadata ? parsedEvent.collectorConfidence : undefined,
          eventHash: createHash("sha256")
            .update(
              JSON.stringify({
                eventType: parsedEvent.eventType,
                tenantId: identity.tenantId,
                sourceAdapter: identity.sourceAdapter,
                sourceRef: parsedEvent.sourceRef,
                payload: parsedEvent.payload
              })
            )
            .digest("hex")
        }
      : parsedEvent;
    const duplicate = await this.eventLogsRepository.findDuplicate({
      tenantId: event.tenantId,
      sourceAdapter: event.sourceAdapter,
      sourceRef: event.sourceRef,
      eventHash: event.eventHash,
      occurredAt: event.occurredAt,
      dedupeWindowMs: env.copilotDedupeWindowMs
    });

    if (duplicate) {
      const existingAlert = await this.alertsRepository.findById(duplicate.alertId);
      if (existingAlert) {
        return existingAlert;
      }
    }

    const sanitized = privacySanitizer(event);
    const priorAlerts = await this.alertsRepository.findRecentForCorrelation(
      event.tenantId,
      event.eventTimestampUtc,
      20 * 60 * 1000
    );
    const sanitizedEvent = {
      ...event,
      payload: sanitized.sanitizedPayload
    };
    const localDatasetInference = isStructuredDatasetEvent(event.eventType)
      ? scoreDatasetEvent(sanitizedEvent)
      : null;
    const inference =
      localDatasetInference ??
      (await this.aiInferenceService.analyze(sanitizedEvent, sanitized));

    const alert = enrichAlertWithIncidentCorrelation({
      draftAlert: alertEngine(sanitizedEvent, sanitized, inference),
      event,
      sanitized,
      priorAlerts
    });

    const eventLog: EventLogRecord = {
      id: randomUUID(),
      alertId: alert.id,
      incidentId: alert.incidentId,
      eventId: event.eventId,
      tenantId: event.tenantId,
      eventType: event.eventType,
      datasetFamily: alert.datasetFamily,
      source: event.source,
      sourceFamily: event.sourceFamily,
      sourceAdapter: event.sourceAdapter,
      sourceRef: event.sourceRef,
      eventHash: event.eventHash,
      occurredAt: event.occurredAt,
      agentMetadata:
        event.agentHints || event.localRiskSignals || typeof event.collectorConfidence === "number"
          ? {
              agentHints: event.agentHints ?? [],
              localRiskSignals: event.localRiskSignals ?? [],
              collectorConfidence: event.collectorConfidence
            }
          : undefined,
      contentLength: sanitized.contentLength,
      label: inference!.label,
      risk: inference!.risk,
      sanitizedPreview: sanitized.sanitizedPreview,
      piiDetected: sanitized.piiDetected,
      detectedBank: sanitized.detectedBank,
      sanitizedPayload: sanitized.sanitizedPayload,
      modelUsed: inference!.modelUsed,
      modelVersion: inference!.modelVersion,
      decisionSource: inference!.decisionSource,
      componentScores: inference!.componentScores,
      evaluationStatus: inference!.evaluationStatus,
      fallbackUsed: inference!.fallbackUsed,
      timestamp: alert.timestamp
    };

    await this.alertsRepository.create(alert);
    await this.eventLogsRepository.create(eventLog);
    await this.incidentService.syncFromAlert(alert, eventLog);

    const [summary] = await Promise.all([this.statsService.getSummary(event.tenantId)]);

    this.io?.to(`tenant:${event.tenantId}`).emit("alert:new", alert);
    this.io?.to(`tenant:${event.tenantId}`).emit("stats:update", summary);

    return alert;
  }

  async ingestBatch(rawInput: unknown, identity?: EventIngestionIdentity): Promise<AlertRecord[]> {
    const events = parseIncomingCyberEventBatch(rawInput);
    const alerts: AlertRecord[] = [];

    for (const event of events) {
      alerts.push(await this.ingest(event, identity));
    }

    return alerts;
  }
}
