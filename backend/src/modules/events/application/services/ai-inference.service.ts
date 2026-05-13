import axios from "axios";

import { env } from "../../../../shared/config/env.js";
import type { AiInferenceResult, EventPayload } from "../../../../shared/types/platform.js";

export class AiInferenceService {
  async analyze(payload: EventPayload): Promise<AiInferenceResult> {
    try {
      const response = await axios.post(
        `${env.aiServiceUrl}/inference/analyze`,
        {
          type: payload.type,
          content: payload.content,
          source: payload.source,
          ip_address: payload.ipAddress,
          country: payload.country,
          device: payload.device,
          user_agent: payload.userAgent
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
        explanation: `Backend fallback used: ${message}`,
        features: ["ai_service_unavailable"],
        modelUsed: "backend_fallback_v1",
        fallbackUsed: true
      };
    }
  }
}
