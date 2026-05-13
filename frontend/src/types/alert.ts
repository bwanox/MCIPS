import type { CyberEventType, EventSource } from "./event";

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

export interface Alert {
  id: string;
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
  sanitizedPreview: string;
  contentLength: number;
  piiDetected: boolean;
  detectedBank?: string;
  payloadSummary: Record<string, unknown>;
  sanitizedPayload: Record<string, unknown>;
  modelUsed: string;
  fallbackUsed: boolean;
  timestamp: string;
}
