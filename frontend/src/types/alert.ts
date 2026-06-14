import type { CyberEventType, EventSource, SourceFamily } from "./event";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type ThreatLabel =
  | "phishing"
  | "scam"
  | "safe"
  | "toxic"
  | "suspicious"
  | "suspicious_login"
  | "network_intrusion"
  | "log_anomaly";
export type DatasetFamily =
  | "network_intrusion"
  | "logging_monitoring"
  | "phishing_email"
  | "sms_threat"
  | "auth_security"
  | "email_message"
  | "text_message";

export interface RiskFactor {
  key: string;
  label: string;
  weight: number;
  detail: string;
}

export interface CorrelatedSignal {
  alertId: string;
  eventId: string;
  eventType: CyberEventType;
  datasetFamily: DatasetFamily;
  label: ThreatLabel;
  risk: RiskLevel;
  title: string;
  timestamp: string;
}

export interface ExplainableRisk {
  baseScore: number;
  correlationBonus: number;
  finalScore: number;
  escalated: boolean;
  factors: RiskFactor[];
}

export interface Alert {
  id: string;
  incidentId: string;
  incidentType: string;
  correlationDetected: boolean;
  incidentSummary: string;
  recommendedActions: string[];
  correlatedSignals: CorrelatedSignal[];
  explainableRisk: ExplainableRisk;
  eventId: string;
  tenantId: string;
  eventType: CyberEventType;
  datasetFamily: DatasetFamily;
  label: ThreatLabel;
  risk: RiskLevel;
  severity: AlertSeverity;
  confidence: number;
  title: string;
  message: string;
  explanation: string;
  features: string[];
  source: EventSource;
  sourceFamily: SourceFamily;
  sourceAdapter: string;
  sourceRef: string;
  eventHash: string;
  occurredAt: string;
  sanitizedPreview: string;
  contentLength: number;
  piiDetected: boolean;
  detectedBank?: string;
  payloadSummary: Record<string, unknown>;
  sanitizedPayload: Record<string, unknown>;
  modelUsed: string;
  fallbackUsed: boolean;
  timestamp: string;
  mitre?: Array<{
    tactic: string;
    techniqueId: string;
    technique: string;
    reason: string;
  }>;
  threatIntel?: Array<{
    type: "url" | "domain" | "ip" | "sender" | "brand";
    value: string;
    reputation: "clean" | "suspicious" | "malicious" | "unknown";
    category: string;
    source: string;
    confidence: number;
    lastSeen: string;
  }>;
}
