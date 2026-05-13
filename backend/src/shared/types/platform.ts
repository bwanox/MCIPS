import type { CyberEventEnvelope, CyberEventSource, CyberEventType, DatasetFamily } from "../../types/cyberEvent.js";

export type EventType = CyberEventType;
export type EventSource = CyberEventSource;
export type ThreatLabel =
  | "phishing"
  | "scam"
  | "safe"
  | "toxic"
  | "suspicious"
  | "suspicious_login"
  | "network_intrusion"
  | "log_anomaly";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface SanitizedEventResult {
  sanitizedPayload: Record<string, unknown>;
  sanitizedPreview: string;
  piiDetected: boolean;
  detectedBank?: string;
  contentLength: number;
  derivedFeatures: Record<string, unknown>;
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
  eventId: string;
  tenantId: string;
  eventType: EventType;
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

export interface EventLogRecord {
  id: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  datasetFamily: DatasetFamily;
  source: EventSource;
  contentLength: number;
  label: ThreatLabel;
  risk: RiskLevel;
  sanitizedPreview: string;
  piiDetected: boolean;
  detectedBank?: string;
  sanitizedPayload: Record<string, unknown>;
  modelUsed: string;
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
  mediumRiskAlerts: number;
  lowRiskAlerts: number;
  phishingCount: number;
  suspiciousLoginCount: number;
  averageConfidence: number;
  riskDistribution: Record<RiskLevel, number>;
  labelDistribution: Record<ThreatLabel, number>;
  datasetFamilyDistribution: Array<{ family: DatasetFamily; count: number }>;
  eventTypeDistribution: Array<{ eventType: EventType; count: number }>;
  topFeatures: Array<{ feature: string; count: number }>;
  recentAlerts: AlertRecord[];
}

export type EventPayload = CyberEventEnvelope;
