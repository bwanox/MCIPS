import { z } from "zod";

import { normalizeIncomingEvent, type isLegacyEventInput } from "../services/eventNormalizer.service.js";
import type { CyberEventEnvelope } from "../types/cyberEvent.js";

const sourceSchema = z.enum(["manual", "simulation", "dataset", "external"]);
const sourceFamilySchema = z.enum(["email", "messaging", "login", "system"]);

const numericField = z.number().finite();
const optionalNumericField = z.number().finite().optional();

const contentPayloadSchema = z.object({
  content: z.string().trim().min(1)
});

const smsPayloadSchema = contentPayloadSchema.extend({
  sender: z.string().optional()
});

const emailMessagePayloadSchema = contentPayloadSchema;

const loginPayloadSchema = z
  .object({
    content: z.string().trim().min(1).optional(),
    ip_address: z.string().optional(),
    country: z.string().optional(),
    device: z.string().optional(),
    user_agent: z.string().optional()
  })
  .refine(
    (payload) =>
      Boolean(payload.content || payload.ip_address || payload.country || payload.device || payload.user_agent),
    "Login attempt payload must include content or device metadata"
  );

const logAnomalyPayloadSchema = z.object({
  timestamp: z.string().datetime().optional(),
  log_level: z.string().trim().min(1),
  component: z.string().trim().min(1),
  event_id: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1),
  anomaly_score: z.number().min(0).max(1),
  is_anomaly: z.number().int().min(0).max(1)
});

const phishingPayloadSchema = z.object({
  email_text_hash: z.string().optional(),
  email_text: z.string().optional(),
  "Email Text": z.string().optional(),
  label: z.string().optional(),
  label_binary: z.number().int().min(0).max(1).optional(),
  char_count: z.number().int().min(0).optional(),
  word_count: z.number().int().min(0).optional(),
  url_count: z.number().int().min(0).optional(),
  has_html: z.boolean().optional(),
  ml_score_phishing: z.number().min(0).max(1).optional(),
  top_tokens: z.array(z.string()).optional()
});

const networkPayloadSchema = z.object({
  duration: optionalNumericField,
  protocol_type: z.string().trim().min(1),
  service: z.string().trim().min(1),
  flag: z.string().trim().min(1),
  src_bytes: optionalNumericField,
  dst_bytes: optionalNumericField,
  land: optionalNumericField,
  wrong_fragment: optionalNumericField,
  urgent: optionalNumericField,
  hot: optionalNumericField,
  num_failed_logins: optionalNumericField,
  logged_in: optionalNumericField,
  num_compromised: optionalNumericField,
  root_shell: optionalNumericField,
  su_attempted: optionalNumericField,
  num_root: optionalNumericField,
  num_file_creations: optionalNumericField,
  num_shells: optionalNumericField,
  num_access_files: optionalNumericField,
  num_outbound_cmds: optionalNumericField,
  is_host_login: optionalNumericField,
  is_guest_login: optionalNumericField,
  count: optionalNumericField,
  srv_count: optionalNumericField,
  serror_rate: optionalNumericField,
  srv_serror_rate: optionalNumericField,
  rerror_rate: optionalNumericField,
  srv_rerror_rate: optionalNumericField,
  same_srv_rate: optionalNumericField,
  diff_srv_rate: optionalNumericField,
  srv_diff_host_rate: optionalNumericField,
  dst_host_count: optionalNumericField,
  dst_host_srv_count: optionalNumericField,
  dst_host_same_srv_rate: optionalNumericField,
  dst_host_diff_srv_rate: optionalNumericField,
  dst_host_same_src_port_rate: optionalNumericField,
  dst_host_srv_diff_host_rate: optionalNumericField,
  dst_host_serror_rate: optionalNumericField,
  dst_host_srv_serror_rate: optionalNumericField,
  dst_host_rerror_rate: optionalNumericField,
  dst_host_srv_rerror_rate: optionalNumericField,
  class: z.string().trim().min(1),
  difficulty_level: optionalNumericField,
  source_ip: z.string().optional(),
  destination_ip: z.string().optional()
});

const normalizedEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventId: z.string().trim().min(1),
    eventType: z.literal("sms.message.received"),
    tenantId: z.string().trim().min(1),
    source: sourceSchema,
    sourceFamily: sourceFamilySchema,
    sourceAdapter: z.string().trim().min(1),
    sourceRef: z.string().trim().min(1),
    eventHash: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    eventTimestampUtc: z.string().datetime(),
    agentHints: z.array(z.string()).optional(),
    localRiskSignals: z.array(z.string()).optional(),
    collectorConfidence: z.number().min(0).max(1).optional(),
    payload: smsPayloadSchema
  }),
  z.object({
    eventId: z.string().trim().min(1),
    eventType: z.literal("email.message.received"),
    tenantId: z.string().trim().min(1),
    source: sourceSchema,
    sourceFamily: sourceFamilySchema,
    sourceAdapter: z.string().trim().min(1),
    sourceRef: z.string().trim().min(1),
    eventHash: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    eventTimestampUtc: z.string().datetime(),
    agentHints: z.array(z.string()).optional(),
    localRiskSignals: z.array(z.string()).optional(),
    collectorConfidence: z.number().min(0).max(1).optional(),
    payload: emailMessagePayloadSchema
  }),
  z.object({
    eventId: z.string().trim().min(1),
    eventType: z.literal("text.message.received"),
    tenantId: z.string().trim().min(1),
    source: sourceSchema,
    sourceFamily: sourceFamilySchema,
    sourceAdapter: z.string().trim().min(1),
    sourceRef: z.string().trim().min(1),
    eventHash: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    eventTimestampUtc: z.string().datetime(),
    agentHints: z.array(z.string()).optional(),
    localRiskSignals: z.array(z.string()).optional(),
    collectorConfidence: z.number().min(0).max(1).optional(),
    payload: contentPayloadSchema
  }),
  z.object({
    eventId: z.string().trim().min(1),
    eventType: z.literal("auth.login.attempt"),
    tenantId: z.string().trim().min(1),
    source: sourceSchema,
    sourceFamily: sourceFamilySchema,
    sourceAdapter: z.string().trim().min(1),
    sourceRef: z.string().trim().min(1),
    eventHash: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    eventTimestampUtc: z.string().datetime(),
    agentHints: z.array(z.string()).optional(),
    localRiskSignals: z.array(z.string()).optional(),
    collectorConfidence: z.number().min(0).max(1).optional(),
    payload: loginPayloadSchema
  }),
  z.object({
    eventId: z.string().trim().min(1),
    eventType: z.literal("log.anomaly.detected"),
    tenantId: z.string().trim().min(1),
    source: sourceSchema,
    sourceFamily: sourceFamilySchema,
    sourceAdapter: z.string().trim().min(1),
    sourceRef: z.string().trim().min(1),
    eventHash: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    eventTimestampUtc: z.string().datetime(),
    agentHints: z.array(z.string()).optional(),
    localRiskSignals: z.array(z.string()).optional(),
    collectorConfidence: z.number().min(0).max(1).optional(),
    payload: logAnomalyPayloadSchema
  }),
  z.object({
    eventId: z.string().trim().min(1),
    eventType: z.literal("phishing.email.detected"),
    tenantId: z.string().trim().min(1),
    source: sourceSchema,
    sourceFamily: sourceFamilySchema,
    sourceAdapter: z.string().trim().min(1),
    sourceRef: z.string().trim().min(1),
    eventHash: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    eventTimestampUtc: z.string().datetime(),
    agentHints: z.array(z.string()).optional(),
    localRiskSignals: z.array(z.string()).optional(),
    collectorConfidence: z.number().min(0).max(1).optional(),
    payload: phishingPayloadSchema
  }),
  z.object({
    eventId: z.string().trim().min(1),
    eventType: z.literal("net.intrusion.suspected"),
    tenantId: z.string().trim().min(1),
    source: sourceSchema,
    sourceFamily: sourceFamilySchema,
    sourceAdapter: z.string().trim().min(1),
    sourceRef: z.string().trim().min(1),
    eventHash: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    eventTimestampUtc: z.string().datetime(),
    agentHints: z.array(z.string()).optional(),
    localRiskSignals: z.array(z.string()).optional(),
    collectorConfidence: z.number().min(0).max(1).optional(),
    payload: networkPayloadSchema
  })
]);

export const parseIncomingCyberEvent = (input: unknown): CyberEventEnvelope =>
  normalizedEventSchema.parse(normalizeIncomingEvent(input as never));

export const parseIncomingCyberEventBatch = (input: unknown): CyberEventEnvelope[] =>
  z.array(z.unknown()).transform((items) => items.map((item) => parseIncomingCyberEvent(item))).parse(input);

export type ParsedCyberEvent = z.infer<typeof normalizedEventSchema>;

export const supportedEventTypes = [
  "net.intrusion.suspected",
  "log.anomaly.detected",
  "phishing.email.detected",
  "sms.message.received",
  "email.message.received",
  "text.message.received",
  "auth.login.attempt"
] as const;

export const eventTypeSchemas = {
  "net.intrusion.suspected": {
    description: "NSL-KDD style structured network telemetry",
    required: ["protocol_type", "service", "flag", "class"]
  },
  "log.anomaly.detected": {
    description: "Structured monitoring anomaly event",
    required: ["log_level", "component", "message", "anomaly_score", "is_anomaly"]
  },
  "phishing.email.detected": {
    description: "Derived phishing email features with no raw email returned",
    required: []
  },
  "sms.message.received": {
    description: "SMS threat analysis input",
    required: ["content"]
  },
  "email.message.received": {
    description: "General email content event",
    required: ["content"]
  },
  "text.message.received": {
    description: "Generic natural-language text event",
    required: ["content"]
  },
  "auth.login.attempt": {
    description: "Authentication attempt metadata event",
    required: []
  }
} as const;
