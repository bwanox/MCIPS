import axios from "axios";

import { env } from "../../../../shared/config/env.js";
import type { AiInferenceResult, EventPayload, SanitizedEventResult } from "../../../../shared/types/platform.js";

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
        { timeout: 10_000 }
      );

      return {
        label: response.data.label,
        confidence: response.data.confidence,
        risk: response.data.risk,
        explanation: response.data.explanation,
        features: response.data.features ?? [],
        modelUsed: response.data.model_used ?? "ai_service",
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
        fallbackUsed: true
      };
    }
  }
}
