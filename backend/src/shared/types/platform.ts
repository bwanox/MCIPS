import type {
  CyberEventEnvelope,
  CyberEventSource,
  CyberEventType,
  DatasetFamily,
  SourceFamily
} from "../../types/cyberEvent.js";

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

export interface RiskFactor {
  key: string;
  label: string;
  weight: number;
  detail: string;
}

export interface CorrelatedSignal {
  alertId: string;
  eventId: string;
  eventType: EventType;
  datasetFamily: DatasetFamily;
  label: ThreatLabel;
  risk: RiskLevel;
  title: string;
  timestamp: string;
}

export interface ExplainableRiskScore {
  baseScore: number;
  correlationBonus: number;
  finalScore: number;
  escalated: boolean;
  factors: RiskFactor[];
}

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

export interface AiGeneratedTextResult {
  content: string;
  modelUsed: string;
  fallbackUsed: boolean;
}

export interface IncidentReasoningResult {
  summary: string;
  recommendedActions: string[];
  approvalRequired: boolean;
  approvalReason: string;
  modelUsed: string;
  fallbackUsed: boolean;
}

export interface IncidentAiProvenance {
  summarySource: "local_model" | "cloud_model" | "deterministic_fallback" | "backend";
  summaryModelUsed: string;
  summaryFallbackUsed: boolean;
  recommendedActionSource: "local_model" | "cloud_model" | "deterministic_fallback" | "backend";
  recommendedActionModelUsed: string;
  recommendedActionFallbackUsed: boolean;
  approvalClassificationSource: "local_model" | "cloud_model" | "deterministic_fallback" | "backend";
  approvalClassificationModelUsed: string;
  approvalClassificationFallbackUsed: boolean;
  approvalRequiredReason?: string;
  lastCopilotAnswerSource?: "local_model" | "cloud_model" | "deterministic_fallback" | "backend";
  lastCopilotAnswerModelUsed?: string;
  lastCopilotAnswerFallbackUsed?: boolean;
}

export interface AgentAdvisoryMetadata {
  agentHints: string[];
  localRiskSignals: string[];
  collectorConfidence?: number;
}

export interface AlertRecord {
  id: string;
  incidentId: string;
  incidentType: string;
  correlationDetected: boolean;
  incidentSummary: string;
  recommendedActions: string[];
  correlatedSignals: CorrelatedSignal[];
  explainableRisk: ExplainableRiskScore;
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
  sourceFamily: SourceFamily;
  sourceAdapter: string;
  sourceRef: string;
  eventHash: string;
  occurredAt: string;
  agentMetadata?: AgentAdvisoryMetadata;
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
  alertId: string;
  incidentId: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  datasetFamily: DatasetFamily;
  source: EventSource;
  sourceFamily: SourceFamily;
  sourceAdapter: string;
  sourceRef: string;
  eventHash: string;
  occurredAt: string;
  agentMetadata?: AgentAdvisoryMetadata;
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

export type IncidentStatus = "new" | "investigating" | "awaiting_approval" | "contained" | "resolved";
export type TriagePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ActionStatus = "requested" | "approved" | "rejected" | "completed";
export type ActionExecutionMode = "notify" | "approval";

export interface IncidentTimelineEntry {
  id: string;
  alertId: string;
  eventId: string;
  eventType: EventType;
  title: string;
  summary: string;
  sourceFamily: SourceFamily;
  sourceAdapter: string;
  occurredAt: string;
  severity: AlertSeverity;
}

export interface IncidentActionRecord {
  id: string;
  incidentId: string;
  label: string;
  actionKey: string;
  status: ActionStatus;
  requiresApproval: boolean;
  executionMode: ActionExecutionMode;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  executionMessage?: string;
}

export interface AuditTrailEntry {
  id: string;
  kind: "event_ingested" | "action_requested" | "action_approved" | "action_rejected" | "notification_sent" | "status_updated";
  message: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  kind: "critical_incident" | "incident_escalated" | "approval_required" | "incident_resolved";
  channel: "email";
  createdAt: string;
  delivered: boolean;
  subject: string;
  recipient: string;
  provider: string;
}

export interface IncidentRecord {
  id: string;
  tenantId: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  triagePriority: TriagePriority;
  sourceFamilies: SourceFamily[];
  firstSeenAt: string;
  lastSeenAt: string;
  summary: string;
  recommendedActions: string[];
  correlatedSignals: CorrelatedSignal[];
  timeline: IncidentTimelineEntry[];
  auditTrail: AuditTrailEntry[];
  actions: IncidentActionRecord[];
  notifications: NotificationRecord[];
  latestAlertId: string;
  latestEventId: string;
  aiProvenance: IncidentAiProvenance;
}

export interface CopilotFeedItem {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  severity: AlertSeverity;
  sourceFamilies: SourceFamily[];
  createdAt: string;
}

export interface CopilotAnswer {
  answer: string;
  usedFallback: boolean;
  source: "local_model" | "cloud_model" | "deterministic_fallback" | "backend";
  modelUsed: string;
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
  correlatedIncidentsCount: number;
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
  topRiskFactors: Array<{ factor: string; count: number }>;
  recentAlerts: AlertRecord[];
}

export type EventPayload = CyberEventEnvelope;
