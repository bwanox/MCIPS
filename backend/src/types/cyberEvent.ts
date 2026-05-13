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

export interface CyberEventEnvelope {
  eventId: string;
  eventType: CyberEventType;
  tenantId: string;
  source: CyberEventSource;
  eventTimestampUtc: string;
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
  }> & {
    payload?: Record<string, unknown>;
    [key: string]: unknown;
  };
