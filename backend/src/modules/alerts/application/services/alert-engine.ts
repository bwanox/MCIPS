import { randomUUID } from "node:crypto";

import type {
  AiInferenceResult,
  AlertRecord,
  AlertSeverity,
  EventPayload,
  SanitizedEventResult
} from "../../../../shared/types/platform.js";
import type { DatasetFamily } from "../../../../types/cyberEvent.js";

const deriveSeverity = (risk: AiInferenceResult["risk"], label: AiInferenceResult["label"]): AlertSeverity => {
  if (
    risk === "HIGH" &&
    (label === "phishing" ||
      label === "suspicious_login" ||
      label === "network_intrusion" ||
      label === "log_anomaly")
  ) {
    return "critical";
  }

  if (risk === "HIGH") {
    return "high";
  }

  if (risk === "MEDIUM") {
    return "medium";
  }

  return "low";
};

const datasetFamilyByType: Record<EventPayload["eventType"], DatasetFamily> = {
  "net.intrusion.suspected": "network_intrusion",
  "log.anomaly.detected": "logging_monitoring",
  "phishing.email.detected": "phishing_email",
  "sms.message.received": "sms_threat",
  "email.message.received": "email_message",
  "text.message.received": "text_message",
  "auth.login.attempt": "auth_security"
};

const buildTitle = (payload: EventPayload, inference: AiInferenceResult): string => {
  if (inference.label === "safe") {
    return "Safe event";
  }

  if (payload.eventType === "net.intrusion.suspected") {
    return "Network intrusion suspected";
  }
  if (payload.eventType === "log.anomaly.detected") {
    return inference.risk === "HIGH" ? "High-risk log anomaly detected" : "Log anomaly detected";
  }
  if (payload.eventType === "phishing.email.detected") {
    return "Phishing email detected";
  }
  if (payload.eventType === "sms.message.received" && inference.label === "phishing") {
    return "Phishing SMS detected";
  }
  if (payload.eventType === "auth.login.attempt" && inference.label === "suspicious_login") {
    return "Suspicious login attempt detected";
  }

  return `${payload.eventType} ${inference.label}`.replaceAll("_", " ");
};

const buildPayloadSummary = (payload: EventPayload, sanitized: SanitizedEventResult): Record<string, unknown> => {
  switch (payload.eventType) {
    case "net.intrusion.suspected":
      return {
        protocol_type: sanitized.sanitizedPayload.protocol_type,
        service: sanitized.sanitizedPayload.service,
        flag: sanitized.sanitizedPayload.flag,
        class: sanitized.sanitizedPayload.class,
        difficulty_level: sanitized.sanitizedPayload.difficulty_level
      };
    case "log.anomaly.detected":
      return {
        component: sanitized.sanitizedPayload.component,
        log_level: sanitized.sanitizedPayload.log_level,
        anomaly_score: sanitized.sanitizedPayload.anomaly_score,
        is_anomaly: sanitized.sanitizedPayload.is_anomaly
      };
    case "phishing.email.detected":
      return {
        label: sanitized.sanitizedPayload.label,
        ml_score_phishing: sanitized.sanitizedPayload.ml_score_phishing,
        url_count: sanitized.sanitizedPayload.url_count,
        has_html: sanitized.sanitizedPayload.has_html
      };
    default:
      return {
        content: sanitized.sanitizedPreview
      };
  }
};

export const alertEngine = (
  payload: EventPayload,
  sanitized: SanitizedEventResult,
  inference: AiInferenceResult
): AlertRecord => {
  const severity = deriveSeverity(inference.risk, inference.label);
  const datasetFamily = datasetFamilyByType[payload.eventType];

  return {
    id: randomUUID(),
    incidentId: `incident-${payload.eventId}`,
    incidentType: datasetFamily,
    correlationDetected: false,
    incidentSummary: "",
    recommendedActions: [],
    correlatedSignals: [],
    explainableRisk: {
      baseScore: 0,
      correlationBonus: 0,
      finalScore: 0,
      escalated: false,
      factors: []
    },
    eventId: payload.eventId,
    tenantId: payload.tenantId,
    eventType: payload.eventType,
    datasetFamily,
    label: inference.label,
    risk: inference.risk,
    severity,
    confidence: inference.confidence,
    title: buildTitle(payload, inference),
    message: `Detected ${inference.label.replaceAll("_", " ")} with ${inference.risk} risk`,
    explanation: inference.explanation,
    features: inference.features,
    source: payload.source,
    sourceFamily: payload.sourceFamily,
    sourceAdapter: payload.sourceAdapter,
    sourceRef: payload.sourceRef,
    eventHash: payload.eventHash,
    occurredAt: payload.occurredAt,
    agentMetadata:
      payload.agentHints || payload.localRiskSignals || typeof payload.collectorConfidence === "number"
        ? {
            agentHints: payload.agentHints ?? [],
            localRiskSignals: payload.localRiskSignals ?? [],
            collectorConfidence: payload.collectorConfidence
          }
        : undefined,
    sanitizedPreview: sanitized.sanitizedPreview,
    contentLength: sanitized.contentLength,
    piiDetected: sanitized.piiDetected,
    detectedBank: sanitized.detectedBank,
    payloadSummary: buildPayloadSummary(payload, sanitized),
    sanitizedPayload: sanitized.sanitizedPayload,
    modelUsed: inference.modelUsed,
    fallbackUsed: inference.fallbackUsed,
    timestamp: payload.eventTimestampUtc
  };
};
