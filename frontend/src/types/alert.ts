export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type ThreatLabel = "phishing" | "scam" | "safe" | "toxic" | "suspicious" | "suspicious_login";

export interface Alert {
  id: string;
  eventType: "SMS" | "EMAIL" | "TEXT" | "LOGIN_ATTEMPT";
  label: ThreatLabel;
  risk: RiskLevel;
  severity: AlertSeverity;
  confidence: number;
  title: string;
  message: string;
  explanation: string;
  features: string[];
  source: "manual" | "simulation" | "external";
  sanitizedPreview: string;
  contentLength: number;
  piiDetected: boolean;
  detectedBank?: string;
  modelUsed: string;
  fallbackUsed: boolean;
  timestamp: string;
}
