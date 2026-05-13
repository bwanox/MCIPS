export type EventType = "SMS" | "EMAIL" | "TEXT" | "LOGIN_ATTEMPT";
export type EventSource = "manual" | "simulation" | "external";
export type ThreatLabel = "phishing" | "scam" | "safe" | "toxic" | "suspicious" | "suspicious_login";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface EventPayload {
  type: EventType;
  content: string;
  source: EventSource;
  ipAddress?: string;
  country?: string;
  device?: string;
  userAgent?: string;
}

export interface SanitizedContentResult {
  sanitizedContent: string;
  sanitizedPreview: string;
  piiDetected: boolean;
  detectedBank?: string;
  contentLength: number;
}

export interface AiInferenceResult {
  label: ThreatLabel;
  confidence: number;
  risk: RiskLevel;
  explanation: string;
  features: string[];
  modelUsed: string;
  fallbackUsed: boolean;
}

export interface AlertRecord {
  id: string;
  eventType: EventType;
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
  modelUsed: string;
  fallbackUsed: boolean;
  timestamp: string;
}

export interface EventLogRecord {
  id: string;
  eventType: EventType;
  source: EventSource;
  label: ThreatLabel;
  risk: RiskLevel;
  sanitizedPreview: string;
  piiDetected: boolean;
  detectedBank?: string;
  fallbackUsed: boolean;
  timestamp: string;
}

export interface TimelinePoint {
  bucket: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface StatsSummary {
  totalAlerts: number;
  highRiskAlerts: number;
  phishingCount: number;
  suspiciousLoginCount: number;
  averageConfidence: number;
  riskDistribution: Record<RiskLevel, number>;
  labelDistribution: Record<ThreatLabel, number>;
  topFeatures: Array<{ feature: string; count: number }>;
  recentAlerts: AlertRecord[];
}
