import type { AlertSeverity, CorrelatedSignal } from "./alert";
import type { CyberEventType, SourceFamily } from "./event";

export type IncidentStatus = "new" | "investigating" | "awaiting_approval" | "contained" | "resolved";
export type TriagePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentActionStatus =
  | "pending"
  | "approved"
  | "dispatching"
  | "completed"
  | "failed"
  | "simulated"
  | "rejected";

export interface IncidentTimelineEntry {
  id: string;
  alertId: string;
  eventId: string;
  eventType: CyberEventType;
  title: string;
  summary: string;
  sourceFamily: SourceFamily;
  sourceAdapter: string;
  occurredAt: string;
  severity: AlertSeverity;
  mitreTags?: string[];
  riskChange?: string;
  recommendedAction?: string;
  evidenceType?: string;
  citationId: string;
}

export interface IncidentAction {
  id: string;
  incidentId: string;
  label: string;
  actionKey: string;
  status: IncidentActionStatus;
  requiresApproval: boolean;
  executionMode: "notify" | "approval";
  createdAt: string;
  updatedAt: string;
  executionMessage?: string;
  executionReceipt?: {
    idempotencyId: string;
    provider: string;
    outcome: "completed" | "failed" | "simulated";
    executedAt: string;
    message: string;
    artifactPaths: string[];
  };
}

export interface IncidentNotification {
  id: string;
  kind: "critical_incident" | "incident_escalated" | "approval_required" | "incident_resolved";
  channel: "email";
  createdAt: string;
  delivered: boolean;
  deliveryStatus: "sent" | "failed" | "simulated" | "not_sent";
  subject: string;
  recipient: string;
  provider: string;
}

export interface Incident {
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
  evidence: Array<{
    id: string;
    citationId: string;
    alertId: string;
    eventId: string;
    title: string;
    summary: string;
    occurredAt: string;
    sourceFamily: SourceFamily;
  }>;
  auditTrail: Array<{ id: string; kind: string; message: string; createdAt: string }>;
  actions: IncidentAction[];
  notifications: IncidentNotification[];
  latestAlertId: string;
  latestEventId: string;
  aiProvenance: {
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
  };
  mitre?: Array<{
    mappingType: "candidate";
    tactic: string;
    techniqueId: string;
    technique: string;
    reason: string;
    confidence: number;
    evidenceIds: string[];
    officialUrl: string;
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
  graph?: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ from: string; to: string; type: string }>;
    evidenceChain: string[];
  };
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
  citations: string[];
  usedFallback: boolean;
  source: "local_model" | "cloud_model" | "deterministic_fallback" | "backend";
  modelUsed: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
