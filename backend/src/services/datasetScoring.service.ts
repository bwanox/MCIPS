import type { AiInferenceResult, RiskLevel, ThreatLabel } from "../shared/types/platform.js";
import type { CyberEventEnvelope } from "../types/cyberEvent.js";

const toNumber = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const toStringValue = (value: unknown): string => (typeof value === "string" ? value : "");

const buildResult = (
  label: ThreatLabel,
  risk: RiskLevel,
  confidence: number,
  explanation: string,
  features: string[]
): AiInferenceResult => ({
  label,
  confidence: Number(confidence.toFixed(3)),
  risk,
  explanation,
  features,
  modelUsed: "dataset_scoring_v1",
  fallbackUsed: false
});

const scoreNetworkIntrusion = (event: CyberEventEnvelope): AiInferenceResult => {
  const payload = event.payload;
  let score = 0;
  const features: string[] = [];

  if (toNumber(payload.root_shell) > 0) {
    score += 30;
    features.push("root_shell_detected");
  }
  if (toNumber(payload.num_failed_logins) > 3) {
    score += 20;
    features.push("failed_login_activity");
  }
  if (toNumber(payload.num_compromised) > 0) {
    score += 25;
    features.push("compromised_host_indicator");
  }
  if (toNumber(payload.wrong_fragment) > 0) {
    score += 10;
    features.push("fragmented_packet");
  }
  if (toNumber(payload.urgent) > 0) {
    score += 10;
    features.push("urgent_packet");
  }
  if (toNumber(payload.serror_rate) > 0.5) {
    score += 15;
    features.push("high_serror_rate");
  }
  if (toNumber(payload.rerror_rate) > 0.5) {
    score += 15;
    features.push("high_rerror_rate");
  }

  const classLabel = toStringValue(payload.class).toLowerCase();
  const label: ThreatLabel = classLabel && classLabel !== "normal" ? "network_intrusion" : "safe";
  if (label === "network_intrusion" && score < 35) {
    score = 35;
  }

  const risk: RiskLevel = score >= 70 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  const confidence = label === "safe" ? 0.86 : Math.min(0.99, 0.55 + score / 100);

  return buildResult(
    label,
    risk,
    confidence,
    `Local network scoring classified class=${classLabel || "unknown"} with score ${score}.`,
    features
  );
};

const scoreLogAnomaly = (event: CyberEventEnvelope): AiInferenceResult => {
  const payload = event.payload;
  const features: string[] = [];
  const anomalyScore = toNumber(payload.anomaly_score);
  const logLevel = toStringValue(payload.log_level).toUpperCase();
  const component = toStringValue(payload.component).toLowerCase();
  const message = toStringValue(payload.message).toLowerCase();
  let score = 0;

  if (toNumber(payload.is_anomaly) === 1) {
    score += 35;
  }
  if (anomalyScore >= 0.8) {
    score += 35;
    features.push("anomaly_score_high");
  } else if (anomalyScore >= 0.5) {
    score += 20;
  }
  if (logLevel === "ERROR" || logLevel === "CRITICAL") {
    score += 15;
    features.push("error_log");
  }
  if (component.includes("auth")) {
    score += 10;
    features.push("auth_component");
  }
  if (message.includes("failed login threshold")) {
    score += 10;
    features.push("failed_login_threshold");
  }

  const risk: RiskLevel = score >= 70 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  const label: ThreatLabel = toNumber(payload.is_anomaly) === 1 ? "log_anomaly" : "safe";
  const confidence = label === "safe" ? 0.8 : Math.min(0.99, Math.max(anomalyScore, 0.55));

  return buildResult(label, risk, confidence, `Local log anomaly scoring produced score ${score}.`, features);
};

const scorePhishingEmail = (event: CyberEventEnvelope): AiInferenceResult => {
  const payload = event.payload;
  const features: string[] = [];
  const mlScore = toNumber(payload.ml_score_phishing);
  const labelBinary = toNumber(payload.label_binary);
  let score = 0;

  if (labelBinary === 1 || mlScore >= 0.8) {
    score += 80;
    features.push("phishing_email_score");
  } else if (mlScore >= 0.5) {
    score += 50;
    features.push("phishing_email_score");
  }
  if (toNumber(payload.url_count) >= 2) {
    score += 10;
    features.push("multiple_urls");
  }
  if (payload.has_html === true) {
    score += 5;
    features.push("html_email");
  }
  if (Array.isArray(payload.top_tokens) && payload.top_tokens.length > 0) {
    score += 5;
    features.push("suspicious_tokens");
  }

  const risk: RiskLevel = score >= 70 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  const label: ThreatLabel = score >= 50 ? "phishing" : "safe";
  const confidence = label === "safe" ? 0.82 : Math.min(0.99, Math.max(mlScore, 0.8));

  return buildResult(label, risk, confidence, `Local phishing feature scoring produced score ${score}.`, features);
};

export const isStructuredDatasetEvent = (eventType: CyberEventEnvelope["eventType"]): boolean =>
  eventType === "net.intrusion.suspected" ||
  eventType === "log.anomaly.detected" ||
  eventType === "phishing.email.detected";

export const scoreDatasetEvent = (event: CyberEventEnvelope): AiInferenceResult | null => {
  switch (event.eventType) {
    case "net.intrusion.suspected":
      return scoreNetworkIntrusion(event);
    case "log.anomaly.detected":
      return scoreLogAnomaly(event);
    case "phishing.email.detected":
      return scorePhishingEmail(event);
    default:
      return null;
  }
};
