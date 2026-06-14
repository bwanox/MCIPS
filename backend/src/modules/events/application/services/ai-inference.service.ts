import axios from "axios";

import { env } from "../../../../shared/config/env.js";
import type {
  AiGeneratedTextResult,
  AiInferenceResult,
  EventPayload,
  IncidentReasoningResult,
  SanitizedEventResult
} from "../../../../shared/types/platform.js";

type AiRequestPayload = {
  type: "SMS" | "EMAIL" | "TEXT" | "LOGIN_ATTEMPT";
  content: string;
  source: EventPayload["source"];
  ip_address?: string;
  country?: string;
  device?: string;
  user_agent?: string;
};

const resolveAiAnalyzeUrl = (baseUrl: string): string => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  if (normalizedBaseUrl.endsWith("/api/v1")) {
    return `${normalizedBaseUrl}/inference/analyze`;
  }

  return `${normalizedBaseUrl}/api/v1/inference/analyze`;
};

const compactObject = (value: Record<string, unknown>): string =>
  Object.entries(value)
    .filter(([, entry]) => entry !== undefined && entry !== "")
    .map(([key, entry]) => `${key}=${Array.isArray(entry) ? entry.join("|") : String(entry)}`)
    .join(", ");

export class AiInferenceService {
  mapCyberEventToAiPayload(event: EventPayload, sanitized: SanitizedEventResult): AiRequestPayload {
    const sanitizedPayload = sanitized.sanitizedPayload;

    switch (event.eventType) {
      case "sms.message.received":
        return {
          type: "SMS",
          content: String(sanitizedPayload.content ?? ""),
          source: event.source
        };
      case "email.message.received":
        return {
          type: "EMAIL",
          content: String(sanitizedPayload.content ?? ""),
          source: event.source
        };
      case "text.message.received":
        return {
          type: "TEXT",
          content: String(sanitizedPayload.content ?? ""),
          source: event.source
        };
      case "auth.login.attempt":
        return {
          type: "LOGIN_ATTEMPT",
          content: String(sanitizedPayload.content ?? "Login attempt detected"),
          source: event.source,
          ip_address: typeof sanitizedPayload.ip_address === "string" ? sanitizedPayload.ip_address : undefined,
          country: typeof sanitizedPayload.country === "string" ? sanitizedPayload.country : undefined,
          device: typeof sanitizedPayload.device === "string" ? sanitizedPayload.device : undefined,
          user_agent: typeof sanitizedPayload.user_agent === "string" ? sanitizedPayload.user_agent : undefined
        };
      case "phishing.email.detected":
        return {
          type: "EMAIL",
          content: `Email features: ${compactObject({
            label: sanitizedPayload.label,
            label_binary: sanitizedPayload.label_binary,
            url_count: sanitizedPayload.url_count,
            has_html: sanitizedPayload.has_html,
            top_tokens: sanitizedPayload.top_tokens
          })}`,
          source: event.source
        };
      case "log.anomaly.detected":
        return {
          type: "TEXT",
          content: `Log anomaly from component ${String(sanitizedPayload.component ?? "unknown")}, level ${String(sanitizedPayload.log_level ?? "unknown")}, anomaly_score ${String(sanitizedPayload.anomaly_score ?? "0")}, message ${String(sanitizedPayload.message ?? "")}`,
          source: event.source
        };
      case "net.intrusion.suspected":
        return {
          type: "TEXT",
          content: `Network intrusion event protocol=${String(sanitizedPayload.protocol_type ?? "unknown")} service=${String(sanitizedPayload.service ?? "unknown")} flag=${String(sanitizedPayload.flag ?? "unknown")} class=${String(sanitizedPayload.class ?? "unknown")} difficulty=${String(sanitizedPayload.difficulty_level ?? "unknown")}`,
          source: event.source
        };
    }
  }

  async analyze(event: EventPayload, sanitized: SanitizedEventResult): Promise<AiInferenceResult> {
    const payload = this.mapCyberEventToAiPayload(event, sanitized);

    try {
      const response = await axios.post(
        resolveAiAnalyzeUrl(env.aiServiceUrl),
        {
          type: payload.type,
          content: payload.content,
          source: payload.source,
          ip_address: payload.ip_address,
          country: payload.country,
          device: payload.device,
          user_agent: payload.user_agent
        },
        {
          timeout: 10_000,
          headers: env.aiServiceToken ? { "X-Service-Token": env.aiServiceToken } : undefined
        }
      );

      return {
        label: response.data.label,
        confidence: response.data.confidence,
        risk: response.data.risk,
        explanation: response.data.explanation,
        features: response.data.features ?? [],
        modelUsed: response.data.model_used ?? "ai_service",
        modelVersion: response.data.model_version,
        decisionSource: response.data.decision_source,
        componentScores: response.data.component_scores
          ? {
              rulesScore: response.data.component_scores.rules_score,
              mlProbability: response.data.component_scores.ml_probability
            }
          : undefined,
        evaluationStatus: response.data.evaluation_status,
        fallbackUsed: Boolean(response.data.fallback_used)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI service unavailable";

      return {
        label: "suspicious",
        confidence: 0.5,
        risk: "MEDIUM",
        explanation: `AI service unavailable; event marked as suspicious by backend fallback. ${message}`,
        features: ["ai_service_unavailable"],
        modelUsed: "backend_fallback",
        modelVersion: "1.0.0",
        decisionSource: "fallback",
        evaluationStatus: "pilot",
        fallbackUsed: true
      };
    }
  }

  async summarizeIncident(input: {
    incidentId: string;
    tenantId: string;
    title: string;
    summary: string;
    recommendedActions: string[];
    signals: Array<{ eventId: string; eventType: string; title: string; label: string; risk: string }>;
  }): Promise<AiGeneratedTextResult | null> {
    try {
      const response = await axios.post(
        resolveAiAnalyzeUrl(env.aiServiceUrl).replace("/inference/analyze", "/incidents/summarize"),
        input,
        {
          timeout: 10_000,
          headers: env.aiServiceToken ? { "X-Service-Token": env.aiServiceToken } : undefined
        }
      );

      return typeof response.data.summary === "string"
        ? {
            content: response.data.summary,
            modelUsed: response.data.model_used ?? "ai_service",
            fallbackUsed: Boolean(response.data.fallback_used)
          }
        : null;
    } catch {
      return null;
    }
  }

  async reasonIncident(input: {
    incidentId: string;
    tenantId: string;
    title: string;
    summary: string;
    recommendedActions: string[];
    signals: Array<{ eventId: string; eventType: string; title: string; label: string; risk: string }>;
  }): Promise<IncidentReasoningResult | null> {
    try {
      const response = await axios.post(
        resolveAiAnalyzeUrl(env.aiServiceUrl).replace("/inference/analyze", "/incidents/reason"),
        input,
        {
          timeout: 10_000,
          headers: env.aiServiceToken ? { "X-Service-Token": env.aiServiceToken } : undefined
        }
      );

      if (typeof response.data.summary !== "string") {
        return null;
      }

      return {
        summary: response.data.summary,
        recommendedActions: Array.isArray(response.data.recommended_actions)
          ? response.data.recommended_actions.filter((value: unknown): value is string => typeof value === "string")
          : input.recommendedActions,
        approvalRequired: Boolean(response.data.approval_required),
        approvalReason:
          typeof response.data.approval_reason === "string"
            ? response.data.approval_reason
            : "Operator approval required for account or access changes.",
        modelUsed: response.data.model_used ?? "ai_service",
        fallbackUsed: Boolean(response.data.fallback_used)
      };
    } catch {
      return null;
    }
  }

  async answerCopilotQuestion(input: {
    incidentId: string;
    summary: string;
    sourceFamilies: string[];
    recommendedActions: string[];
    timeline: Array<{
      title: string;
      occurredAt: string;
      sourceFamily: string;
      severity: string;
      citationId: string;
    }>;
    evidence: Array<{
      citationId: string;
      title: string;
      summary: string;
      occurredAt: string;
      sourceFamily: string;
    }>;
    question: string;
  }): Promise<AiGeneratedTextResult | null> {
    try {
      const response = await axios.post(
        resolveAiAnalyzeUrl(env.aiServiceUrl).replace("/inference/analyze", "/copilot/answer"),
        input,
        {
          timeout: 10_000,
          headers: env.aiServiceToken ? { "X-Service-Token": env.aiServiceToken } : undefined
        }
      );

      return typeof response.data.answer === "string"
        ? {
            content: response.data.answer,
            modelUsed: response.data.model_used ?? "ai_service",
            citations: Array.isArray(response.data.citations)
              ? response.data.citations.filter((value: unknown): value is string => typeof value === "string")
              : [],
            fallbackUsed: Boolean(response.data.fallback_used)
          }
        : null;
    } catch {
      return null;
    }
  }
}
