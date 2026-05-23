export type CyberEventType =
  | "net.intrusion.suspected"
  | "log.anomaly.detected"
  | "phishing.email.detected"
  | "sms.message.received"
  | "email.message.received"
  | "text.message.received"
  | "auth.login.attempt";

export type EventSource = "manual" | "simulation" | "dataset" | "external";
export type SourceFamily = "email" | "messaging" | "login" | "system";

export interface UnifiedEventEnvelope {
  eventId?: string;
  eventType: CyberEventType;
  tenantId?: string;
  source?: EventSource;
  sourceFamily?: SourceFamily;
  sourceAdapter?: string;
  sourceRef?: string;
  eventHash?: string;
  occurredAt?: string;
  eventTimestampUtc?: string;
  payload: Record<string, unknown>;
}

export interface EventTypesResponse {
  supportedEventTypes: CyberEventType[];
  schemas: Record<string, { description: string; required: string[] }>;
}
