import { randomUUID } from "node:crypto";

import type { CyberEventEnvelope, CyberEventType, IncomingCyberEvent, LegacyEventInput } from "../types/cyberEvent.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

    return {
      eventId: randomUUID(),
      eventType,
      tenantId: "tenant-demo",
      source: input.source ?? "manual",
      eventTimestampUtc: new Date().toISOString(),
      payload: buildLegacyPayload(input, eventType)
    };
  }

  const payload = isRecord(input.payload) ? input.payload : {};

  return {
    eventId:
      typeof input.eventId === "string"
        ? input.eventId
        : typeof input.event_id === "string"
          ? input.event_id
          : randomUUID(),
    eventType:
      (typeof input.eventType === "string" ? input.eventType : input.event_type) ?? "text.message.received",
    tenantId:
      typeof input.tenantId === "string"
        ? input.tenantId
        : typeof input.tenant_id === "string"
          ? input.tenant_id
          : "tenant-demo",
    source: (typeof input.source === "string" ? input.source : "manual") as CyberEventEnvelope["source"],
    eventTimestampUtc:
      typeof input.eventTimestampUtc === "string"
        ? input.eventTimestampUtc
        : typeof input.event_timestamp_utc === "string"
          ? input.event_timestamp_utc
          : new Date().toISOString(),
    payload
  };
};
