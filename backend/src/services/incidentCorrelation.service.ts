import { randomUUID } from "node:crypto";

import type {
  AiInferenceResult,
  AlertRecord,
  CorrelatedSignal,
  EventPayload,
  ExplainableRiskScore,
  RiskFactor,
  RiskLevel,
  SanitizedEventResult
} from "../shared/types/platform.js";

const correlationWindowMs = 20 * 60 * 1000;

const baseRiskScoreByRisk: Record<RiskLevel, number> = {
  LOW: 24,
  MEDIUM: 56,
  HIGH: 82
};

const riskFromScore = (score: number): RiskLevel => {
  if (score >= 75) {
    return "HIGH";
  }
  if (score >= 40) {
    return "MEDIUM";
  }
  return "LOW";
};

const severityFromRisk = (
  risk: RiskLevel,
  correlationDetected: boolean,
  label: AlertRecord["label"]
): AlertRecord["severity"] => {
  if (
    risk === "HIGH" &&
    (correlationDetected ||
      label === "phishing" ||
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

const messageFamilySet = new Set(["sms_threat", "email_message", "text_message", "phishing_email"]);

const buildBaseFactors = (
  alert: AlertRecord,
  event: EventPayload,
  sanitized: SanitizedEventResult
): RiskFactor[] => {
  const factors: RiskFactor[] = [
    {
      key: "base_risk",
      label: `Base ${alert.risk.toLowerCase()} risk`,
      weight: baseRiskScoreByRisk[alert.risk],
      detail: "Initial detector or AI classification before incident correlation."
    }
  ];

  if (alert.label === "phishing") {
    factors.push({
      key: "phishing_signal",
      label: "Phishing indicators",
      weight: 18,
      detail: "Message or email content carries phishing-like language, URLs, or impersonation clues."
    });
  }

  if (sanitized.detectedBank) {
    factors.push({
      key: "moroccan_bank_impersonation",
      label: "Moroccan bank impersonation",
      weight: 15,
      detail: `Sanitizer detected likely impersonation of ${sanitized.detectedBank}.`
    });
  }

  if (alert.features.includes("otp_request")) {
    factors.push({
      key: "otp_request",
      label: "OTP verification lure",
      weight: 10,
      detail: "Threat explanation includes verification code or OTP pressure."
    });
  }

  if (event.eventType === "auth.login.attempt") {
    factors.push({
      key: "new_device_login",
      label: "Suspicious login context",
      weight: 18,
      detail: "Login attempt came from an unfamiliar device, IP, or access context."
    });
  }

  if (event.eventType === "net.intrusion.suspected" && alert.label === "network_intrusion") {
    factors.push({
      key: "network_intrusion_signal",
      label: "Intrusion telemetry",
      weight: 22,
      detail: "Structured network features indicate malicious or abnormal network behavior."
    });
  }

  if (event.eventType === "log.anomaly.detected" && alert.label === "log_anomaly") {
    factors.push({
      key: "log_anomaly_signal",
      label: "High-risk anomaly log",
      weight: 14,
      detail: "The anomaly detector found risky logging behavior that may signal compromise."
    });
  }

  return factors;
};

const signalWithinWindow = (currentTimestamp: string, candidateTimestamp: string): boolean =>
  Math.abs(new Date(currentTimestamp).getTime() - new Date(candidateTimestamp).getTime()) <= correlationWindowMs;

const canCorrelate = (alert: AlertRecord): boolean =>
  (alert.label === "phishing" || alert.label === "suspicious_login" || alert.label === "network_intrusion") &&
  alert.risk !== "LOW";

const buildRecommendedActions = (
  event: EventPayload,
  correlatedSignals: CorrelatedSignal[],
  correlationDetected: boolean
): string[] => {
  const actions = new Set<string>();

  if (
    messageFamilySet.has(correlatedSignals[0]?.datasetFamily ?? "") ||
    event.eventType === "sms.message.received" ||
    event.eventType === "email.message.received" ||
    event.eventType === "phishing.email.detected"
  ) {
    actions.add("Block the sender, suspicious domain, or delivery channel.");
  }

  if (event.eventType === "auth.login.attempt" || correlatedSignals.some((signal) => signal.datasetFamily === "auth_security")) {
    actions.add("Force a password reset and invalidate active sessions.");
    actions.add("Review recent login logs for additional suspicious access attempts.");
  }

  if (event.eventType === "net.intrusion.suspected" || correlatedSignals.some((signal) => signal.datasetFamily === "network_intrusion")) {
    actions.add("Inspect the affected host or segment for further network intrusion evidence.");
  }

  if (correlationDetected) {
    actions.add("Notify the targeted user or team about the correlated phishing and account-compromise risk.");
  }

  actions.add("Preserve the sanitized incident report for analyst review and escalation.");

  return [...actions];
};

const buildIncidentSummary = (
  alert: AlertRecord,
  event: EventPayload,
  sanitized: SanitizedEventResult,
  correlatedSignals: CorrelatedSignal[],
  explainableRisk: ExplainableRiskScore
): string => {
  const sanitizedNote = sanitized.piiDetected
    ? "Sensitive content was sanitized before storage and analysis."
    : "No direct personal content needed masking in this signal.";

  if (correlatedSignals.length > 0 && event.eventType === "auth.login.attempt") {
    return `A phishing-like lure was followed by a suspicious login attempt for the same tenant, raising account-compromise risk to ${riskFromScore(explainableRisk.finalScore)}. ${sanitizedNote}`;
  }

  if (correlatedSignals.length > 0 && event.eventType === "net.intrusion.suspected") {
    return `A network intrusion signal reinforced an existing suspicious activity trail for this tenant. The combined evidence raised risk to ${riskFromScore(explainableRisk.finalScore)}. ${sanitizedNote}`;
  }

  if (alert.datasetFamily === "sms_threat") {
    return `Potential phishing SMS detected with Morocco-relevant fraud indicators. ${sanitizedNote}`;
  }

  if (alert.datasetFamily === "phishing_email") {
    return `Phishing email features suggest credential theft or impersonation behavior, including Morocco-relevant account verification lures. ${sanitizedNote}`;
  }

  if (alert.datasetFamily === "auth_security") {
    return `Suspicious authentication activity was detected and scored for fast analyst review. ${sanitizedNote}`;
  }

  if (alert.datasetFamily === "network_intrusion") {
    return `Network telemetry indicates potentially malicious traffic or compromise behavior. ${sanitizedNote}`;
  }

  return `${alert.title} detected for tenant visibility. ${sanitizedNote}`;
};

const buildIncidentTitle = (alert: AlertRecord, correlatedSignals: CorrelatedSignal[], event: EventPayload): string => {
  if (correlatedSignals.length > 0 && event.eventType === "auth.login.attempt") {
    return "Correlated phishing and suspicious login detected";
  }

  if (correlatedSignals.length > 0 && event.eventType === "net.intrusion.suspected") {
    return "Multi-signal compromise suspected";
  }

  if (alert.datasetFamily === "sms_threat" && alert.label === "phishing") {
    return "Phishing SMS detected";
  }

  if (alert.datasetFamily === "auth_security" && alert.label === "suspicious_login") {
    return "Suspicious login attempt detected";
  }

  if (alert.datasetFamily === "network_intrusion" && alert.label === "network_intrusion") {
    return "Network intrusion suspected";
  }

  return alert.title;
};

const deriveIncidentType = (alert: AlertRecord, correlatedSignals: CorrelatedSignal[]): string => {
  if (correlatedSignals.length > 0) {
    return "correlated_account_compromise";
  }
  return alert.datasetFamily;
};

export const enrichAlertWithIncidentCorrelation = ({
  draftAlert,
  event,
  sanitized,
  priorAlerts
}: {
  draftAlert: AlertRecord;
  event: EventPayload;
  sanitized: SanitizedEventResult;
  priorAlerts: AlertRecord[];
}): AlertRecord => {
  const currentTimestamp = event.eventTimestampUtc;
  const matchingSignals = priorAlerts
    .filter((alert) => alert.tenantId === event.tenantId)
    .filter((alert) => signalWithinWindow(currentTimestamp, alert.timestamp))
    .filter(canCorrelate)
    .filter((alert) => {
      if (event.eventType === "auth.login.attempt") {
        return messageFamilySet.has(alert.datasetFamily);
      }
      if (event.eventType === "net.intrusion.suspected") {
        return alert.datasetFamily === "auth_security" || messageFamilySet.has(alert.datasetFamily);
      }
      return false;
    })
    .slice(0, 3)
    .map<CorrelatedSignal>((alert) => ({
      alertId: alert.id,
      eventId: alert.eventId,
      eventType: alert.eventType,
      datasetFamily: alert.datasetFamily,
      label: alert.label,
      risk: alert.risk,
      title: alert.title,
      timestamp: alert.timestamp
    }));

  const baseFactors = buildBaseFactors(draftAlert, event, sanitized);
  let correlationBonus = 0;
  const correlationFactors: RiskFactor[] = [];

  if (matchingSignals.length > 0) {
    correlationBonus += 26;
    correlationFactors.push({
      key: "correlated_signal_chain",
      label: "Correlated multi-signal incident",
      weight: 26,
      detail: "Multiple threat signals were linked for the same tenant within a short response window."
    });
  }

  if (
    event.eventType === "auth.login.attempt" &&
    matchingSignals.some((signal) => messageFamilySet.has(signal.datasetFamily))
  ) {
    correlationBonus += 12;
    correlationFactors.push({
      key: "phishing_then_login",
      label: "Phishing followed by login activity",
      weight: 12,
      detail: "A phishing-like message signal was followed by a suspicious authentication attempt."
    });
  }

  if (
    event.eventType === "net.intrusion.suspected" &&
    matchingSignals.some((signal) => signal.datasetFamily === "auth_security")
  ) {
    correlationBonus += 10;
    correlationFactors.push({
      key: "login_then_network",
      label: "Login and network escalation",
      weight: 10,
      detail: "Network telemetry reinforced an already suspicious access pattern."
    });
  }

  const explainableRisk: ExplainableRiskScore = {
    baseScore: baseRiskScoreByRisk[draftAlert.risk],
    correlationBonus,
    finalScore: Math.min(
      100,
      baseRiskScoreByRisk[draftAlert.risk] +
        baseFactors.filter((factor) => factor.key !== "base_risk").reduce((sum, factor) => sum + factor.weight, 0) +
        correlationBonus
    ),
    escalated: matchingSignals.length > 0,
    factors: [...baseFactors, ...correlationFactors]
  };

  const finalRisk = riskFromScore(explainableRisk.finalScore);
  const correlationDetected = matchingSignals.length > 0;
  const incidentId = correlationDetected ? matchingSignals[0]?.alertId ?? `incident-${draftAlert.eventId}` : `incident-${draftAlert.eventId}`;
  const recommendedActions = buildRecommendedActions(event, matchingSignals, correlationDetected);
  const title = buildIncidentTitle(draftAlert, matchingSignals, event);
  const incidentSummary = buildIncidentSummary(draftAlert, event, sanitized, matchingSignals, explainableRisk);

  return {
    ...draftAlert,
    incidentId,
    incidentType: deriveIncidentType(draftAlert, matchingSignals),
    correlationDetected,
    title,
    message: correlationDetected
      ? `Correlated incident escalated to ${finalRisk} risk`
      : draftAlert.message,
    risk: finalRisk,
    severity: severityFromRisk(finalRisk, correlationDetected, draftAlert.label),
    incidentSummary,
    recommendedActions,
    correlatedSignals: matchingSignals,
    explainableRisk
  };
};
