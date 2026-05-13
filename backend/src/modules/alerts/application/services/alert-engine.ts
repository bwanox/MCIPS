import { randomUUID } from "node:crypto";

import type {
  AiInferenceResult,
  AlertRecord,
  AlertSeverity,
  EventPayload,
  SanitizedContentResult
} from "../../../../shared/types/platform.js";

const deriveSeverity = (risk: AiInferenceResult["risk"], label: AiInferenceResult["label"]): AlertSeverity => {
  if (risk === "HIGH" && (label === "phishing" || label === "suspicious_login")) {
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

export const alertEngine = (
  payload: EventPayload,
  sanitized: SanitizedContentResult,
  inference: AiInferenceResult
): AlertRecord => {
  const severity = deriveSeverity(inference.risk, inference.label);

  return {
    id: randomUUID(),
    eventType: payload.type,
    label: inference.label,
    risk: inference.risk,
    severity,
    confidence: inference.confidence,
    title: `${payload.type.replaceAll("_", " ")} ${inference.label.replaceAll("_", " ")}`,
    message: `Detected ${inference.label} with ${inference.risk} risk`,
    explanation: inference.explanation,
    features: inference.features,
    source: payload.source,
    sanitizedPreview: sanitized.sanitizedPreview,
    contentLength: sanitized.contentLength,
    piiDetected: sanitized.piiDetected,
    detectedBank: sanitized.detectedBank,
    modelUsed: inference.modelUsed,
    fallbackUsed: inference.fallbackUsed,
    timestamp: new Date().toISOString()
  };
};
