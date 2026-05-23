export type CyberEventType =
  | "net.intrusion.suspected"
  | "log.anomaly.detected"
  | "phishing.email.detected"
  | "sms.message.received"
  | "email.message.received"
  | "text.message.received"
  | "auth.login.attempt";

export type CyberEventSource = "manual" | "simulation" | "dataset" | "external";

export type DatasetFamily =
  | "network_intrusion"
  | "logging_monitoring"
  | "phishing_email"
  | "sms_threat"
  | "auth_security"
  | "email_message"
  | "text_message";

export type SourceFamily = "email" | "messaging" | "login" | "system";

export interface CyberEventEnvelope {
  eventId: string;
  eventType: CyberEventType;
  tenantId: string;
  source: CyberEventSource;
  sourceFamily: SourceFamily;
  sourceAdapter: string;
  sourceRef: string;
  eventHash: string;
  occurredAt: string;
  eventTimestampUtc: string;
  agentHints?: string[];
  localRiskSignals?: string[];
  collectorConfidence?: number;
  payload: Record<string, unknown>;
}

export interface LegacyEventInput {
  type: "SMS" | "EMAIL" | "TEXT" | "LOGIN_ATTEMPT";
  content?: string;
  source?: CyberEventSource;
  ipAddress?: string;
  country?: string;
  device?: string;
  userAgent?: string;
  ip_address?: string;
  user_agent?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export type IncomingCyberEvent = Partial<CyberEventEnvelope> &
  Partial<{
    event_id: string;
    event_type: CyberEventType;
    tenant_id: string;
    event_timestamp_utc: string;
    sourceFamily: SourceFamily;
    sourceAdapter: string;
    sourceRef: string;
    eventHash: string;
    occurredAt: string;
    agentHints: string[];
    localRiskSignals: string[];
    collectorConfidence: number;
    source_family: SourceFamily;
    source_adapter: string;
    source_ref: string;
    event_hash: string;
    occurred_at: string;
    agent_hints: string[];
    local_risk_signals: string[];
    collector_confidence: number;
  }> & {
    payload?: Record<string, unknown>;
    [key: string]: unknown;
  };
