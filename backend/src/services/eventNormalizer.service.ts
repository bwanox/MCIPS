import { createHash, randomUUID } from "node:crypto";

import type {
  CyberEventEnvelope,
  CyberEventType,
  IncomingCyberEvent,
  LegacyEventInput,
  SourceFamily
} from "../types/cyberEvent.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sourceFamilyByEventType: Record<CyberEventType, SourceFamily> = {
  "email.message.received": "email",
  "phishing.email.detected": "email",
  "sms.message.received": "messaging",
  "text.message.received": "messaging",
  "auth.login.attempt": "login",
  "log.anomaly.detected": "system",
  "net.intrusion.suspected": "system"
};

const buildEventHash = ({
  eventType,
  tenantId,
  sourceAdapter,
  sourceRef,
  payload
}: {
  eventType: CyberEventType;
  tenantId: string;
  sourceAdapter: string;
  sourceRef: string;
  payload: Record<string, unknown>;
}): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        eventType,
        tenantId,
        sourceAdapter,
        sourceRef,
        payload
      })
    )
    .digest("hex");

const inferLegacyEmailEventType = (input: LegacyEventInput): CyberEventType => {
  const payload = isRecord(input.payload) ? input.payload : {};
  const phishingIndicators = [
    input.label,
    input.label_binary,
    input.ml_score_phishing,
    payload.label,
    payload.label_binary,
    payload.ml_score_phishing
  ];

  return phishingIndicators.some((value) => value !== undefined)
    ? "phishing.email.detected"
    : "email.message.received";
};

const mapLegacyTypeToEventType = (input: LegacyEventInput): CyberEventType => {
  switch (input.type) {
    case "SMS":
      return "sms.message.received";
    case "EMAIL":
      return inferLegacyEmailEventType(input);
    case "TEXT":
      return "text.message.received";
    case "LOGIN_ATTEMPT":
      return "auth.login.attempt";
    default:
      return "text.message.received";
  }
};

const buildLegacyPayload = (input: LegacyEventInput, eventType: CyberEventType): Record<string, unknown> => {
  const payload = isRecord(input.payload) ? { ...input.payload } : {};

  if (eventType === "auth.login.attempt") {
    return {
      content: typeof input.content === "string" ? input.content : "Login attempt detected",
      ip_address: typeof input.ip_address === "string" ? input.ip_address : input.ipAddress,
      country: input.country,
      device: input.device,
      user_agent: typeof input.user_agent === "string" ? input.user_agent : input.userAgent,
      ...payload
    };
  }

  if (eventType === "phishing.email.detected") {
    return {
      ...(typeof input.content === "string" ? { email_text: input.content } : {}),
      ...payload
    };
  }

  return {
    ...(typeof input.content === "string" ? { content: input.content } : {}),
    ...payload
  };
};

export const isLegacyEventInput = (input: unknown): input is LegacyEventInput =>
  isRecord(input) && typeof input.type === "string";

export const normalizeIncomingEvent = (input: IncomingCyberEvent | LegacyEventInput): CyberEventEnvelope => {
  if (isLegacyEventInput(input)) {
    const eventType = mapLegacyTypeToEventType(input);
    const sourceFamily = sourceFamilyByEventType[eventType];
    const payload = buildLegacyPayload(input, eventType);
    const sourceAdapter = `legacy-${sourceFamily}`;
    const sourceRef = typeof input.id === "string" ? input.id : randomUUID();
    const occurredAt = new Date().toISOString();
    const tenantId = "tenant-demo";

    return {
      eventId: randomUUID(),
      eventType,
      tenantId,
      source: input.source ?? "manual",
      sourceFamily,
      sourceAdapter,
      sourceRef,
      eventHash: buildEventHash({
        eventType,
        tenantId,
        sourceAdapter,
        sourceRef,
        payload
      }),
      occurredAt,
      eventTimestampUtc: occurredAt,
      payload
    };
  }

  const payload = isRecord(input.payload) ? input.payload : {};
  const eventType =
    (typeof input.eventType === "string" ? input.eventType : input.event_type) ?? "text.message.received";
  const tenantId =
    typeof input.tenantId === "string" ? input.tenantId : typeof input.tenant_id === "string" ? input.tenant_id : "tenant-demo";
  const sourceFamily =
    (typeof input.sourceFamily === "string"
      ? input.sourceFamily
      : typeof input.source_family === "string"
        ? input.source_family
        : sourceFamilyByEventType[eventType]) as SourceFamily;
  const sourceAdapter =
    typeof input.sourceAdapter === "string"
      ? input.sourceAdapter
      : typeof input.source_adapter === "string"
        ? input.source_adapter
        : `direct-${sourceFamily}`;
  const sourceRef =
    typeof input.sourceRef === "string"
      ? input.sourceRef
      : typeof input.source_ref === "string"
        ? input.source_ref
        : typeof input.eventId === "string"
          ? input.eventId
          : typeof input.event_id === "string"
            ? input.event_id
            : randomUUID();
  const occurredAt =
    typeof input.occurredAt === "string"
      ? input.occurredAt
      : typeof input.occurred_at === "string"
        ? input.occurred_at
        : typeof input.eventTimestampUtc === "string"
          ? input.eventTimestampUtc
          : typeof input.event_timestamp_utc === "string"
            ? input.event_timestamp_utc
            : new Date().toISOString();
  const agentHints =
    Array.isArray(input.agentHints) && input.agentHints.every((item) => typeof item === "string")
      ? input.agentHints
      : Array.isArray(input.agent_hints) && input.agent_hints.every((item) => typeof item === "string")
        ? input.agent_hints
        : undefined;
  const localRiskSignals =
    Array.isArray(input.localRiskSignals) && input.localRiskSignals.every((item) => typeof item === "string")
      ? input.localRiskSignals
      : Array.isArray(input.local_risk_signals) && input.local_risk_signals.every((item) => typeof item === "string")
        ? input.local_risk_signals
        : undefined;
  const collectorConfidence =
    typeof input.collectorConfidence === "number"
      ? input.collectorConfidence
      : typeof input.collector_confidence === "number"
        ? input.collector_confidence
        : undefined;

  return {
    eventId:
      typeof input.eventId === "string"
        ? input.eventId
        : typeof input.event_id === "string"
          ? input.event_id
          : randomUUID(),
    eventType,
    tenantId,
    source: (typeof input.source === "string" ? input.source : "manual") as CyberEventEnvelope["source"],
    sourceFamily,
    sourceAdapter,
    sourceRef,
    eventHash:
      typeof input.eventHash === "string"
        ? input.eventHash
        : typeof input.event_hash === "string"
          ? input.event_hash
          : buildEventHash({
              eventType,
              tenantId,
              sourceAdapter,
              sourceRef,
              payload
            }),
    occurredAt,
    eventTimestampUtc:
      typeof input.eventTimestampUtc === "string"
        ? input.eventTimestampUtc
        : typeof input.event_timestamp_utc === "string"
          ? input.event_timestamp_utc
          : occurredAt,
    ...(agentHints ? { agentHints } : {}),
    ...(localRiskSignals ? { localRiskSignals } : {}),
    ...(typeof collectorConfidence === "number" ? { collectorConfidence } : {}),
    payload
  };
};
