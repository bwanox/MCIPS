import type { AlertRecord, ExplainableRiskScore, RiskFactor, RiskLevel, ThreatIndicator } from "../shared/types/platform.js";

const baseRiskScoreByRisk: Record<RiskLevel, number> = {
  LOW: 24,
  MEDIUM: 56,
  HIGH: 82
};

export const calculateExplainableRisk = ({
  draftAlert,
  indicators,
  correlationDetected,
  event
}: {
  draftAlert: Partial<AlertRecord> & { label: string; risk: RiskLevel; confidence: number; features: string[] };
  indicators: ThreatIndicator[];
  correlationDetected: boolean;
  event: any;
}): ExplainableRiskScore => {
  const factors: RiskFactor[] = [];
  
  // 1. Model confidence contribution
  const confidenceScore = Math.round(draftAlert.confidence * 40) || 38;
  factors.push({
    key: "base_confidence",
    label: "Base model confidence",
    weight: confidenceScore,
    detail: `AI model confidence score of ${(draftAlert.confidence * 100).toFixed(0)}% contributing to threat classification.`
  });

  // 2. Message risk
  if (draftAlert.label === "phishing" || draftAlert.label === "scam" || draftAlert.label === "toxic") {
    factors.push({
      key: "message_risk",
      label: "Phishing indicators",
      weight: 18,
      detail: "Content analyzed contains phishing-like language or urgent call to action."
    });
  }

  // 3. Threat intel hits
  const maliciousIntel = indicators.filter(ind => ind.reputation === "malicious");
  const suspiciousIntel = indicators.filter(ind => ind.reputation === "suspicious");

  if (maliciousIntel.length > 0) {
    factors.push({
      key: "threat_intel_hit",
      label: "Threat intel hit",
      weight: 15,
      detail: `Local threat feed matching malicious metadata indicators: ${maliciousIntel.map(i => i.value).join(", ")}.`
    });
  } else if (suspiciousIntel.length > 0) {
    factors.push({
      key: "threat_intel_suspicious",
      label: "Threat intel hit",
      weight: 10,
      detail: `Local threat feed matching suspicious metadata indicators: ${suspiciousIntel.map(i => i.value).join(", ")}.`
    });
  }

  // 4. URL risk specifically
  const hasMaliciousUrl = indicators.some(ind => ind.type === "url" && ind.reputation === "malicious");
  if (hasMaliciousUrl) {
    factors.push({
      key: "suspicious_url",
      label: "Suspicious URL",
      weight: 18,
      detail: "Message payload contains an active phishing or spoofed URL matching threat intelligence feeds."
    });
  }

  // 5. ATT&CK technique severity
  if (draftAlert.label === "phishing") {
    factors.push({
      key: "mitre_severity",
      label: "ATT&CK technique severity",
      weight: 10,
      detail: "Mapped to technique T1566 (Phishing) representing high initial compromise severity."
    });
  } else if (draftAlert.label === "suspicious_login") {
    factors.push({
      key: "mitre_severity_login",
      label: "ATT&CK technique severity",
      weight: 12,
      detail: "Mapped to technique T1078 (Valid Accounts) representing credential exploitation."
    });
  }

  // 6. Login anomaly score / device
  if (event.eventType === "auth.login.attempt") {
    const isNewDevice = draftAlert.features.includes("otp_request") || 
                        draftAlert.features.includes("failed_login_activity") || 
                        event.payload?.device || 
                        event.payload?.ip_address;
    if (isNewDevice) {
      factors.push({
        key: "unknown_device",
        label: "Unknown device",
        weight: 9,
        detail: "Login attempt came from an unfamiliar device, IP, or country location context."
      });
    }
  }

  // 7. Network anomaly score
  if (event.eventType === "net.intrusion.suspected" && draftAlert.label === "network_intrusion") {
    factors.push({
      key: "network_anomaly_score",
      label: "Network anomaly score",
      weight: 22,
      detail: "Local network heuristics flag high-risk protocol fragmentation or suspicious ports."
    });
  }

  // 8. Log anomaly score
  if (event.eventType === "log.anomaly.detected" && draftAlert.label === "log_anomaly") {
    factors.push({
      key: "log_anomaly_score",
      label: "Log anomaly score",
      weight: 14,
      detail: "Anomalous system or auth log activity flagged as suspicious."
    });
  }

  // 9. Correlation Bonus
  let correlationBonus = 0;
  if (correlationDetected) {
    correlationBonus += 20;

    const isPhishing = draftAlert.label === "phishing" || draftAlert.label === "scam" || event.eventType?.includes("sms") || event.eventType?.includes("email");
    const isLogin = draftAlert.label === "suspicious_login" || event.eventType?.includes("auth") || event.eventType?.includes("login");

    let label = "Correlated multi-vector threat";
    let detail = "Multiple suspicious security signals were correlated for the same tenant/user.";

    if ((isPhishing && isLogin) || (draftAlert.label === "suspicious_login" && correlationDetected)) {
      label = "Phishing followed by login";
      detail = "A suspected phishing communication was correlated with a subsequent login attempt.";
    } else if (draftAlert.label === "network_intrusion" || event.eventType?.includes("net")) {
      label = "Network anomaly correlation";
      detail = "Suspicious network events were correlated with related host or log activity.";
    }

    factors.push({
      key: "correlation_bonus",
      label,
      weight: 20,
      detail
    });
  }

  // Calculate final score
  const sumWeights = factors.reduce((sum, f) => sum + f.weight, 0);
  const baseline = baseRiskScoreByRisk[draftAlert.risk] || 24;
  const finalScore = Math.min(100, Math.max(baseline, sumWeights));

  return {
    baseScore: baseRiskScoreByRisk[draftAlert.risk] || 50,
    correlationBonus,
    finalScore,
    escalated: correlationDetected,
    factors
  };
};
