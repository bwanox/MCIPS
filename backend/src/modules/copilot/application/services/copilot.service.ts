import type { CopilotAnswer } from "../../../../shared/types/platform.js";
import type { IncidentService } from "../../../incidents/application/services/incident.service.js";
import type { AiInferenceService } from "../../../events/application/services/ai-inference.service.js";

const toCopilotSource = (modelUsed: string, fallbackUsed: boolean): CopilotAnswer["source"] => {
  if (fallbackUsed) {
    return "deterministic_fallback";
  }
  if (modelUsed.toLowerCase().includes("qwen") || modelUsed.toLowerCase().includes("openrouter")) {
    return "cloud_model";
  }
  return "local_model";
};

export class CopilotService {
  constructor(
    private readonly incidentService: IncidentService,
    private readonly aiInferenceService: AiInferenceService
  ) {}

  async answerIncidentQuestion(incidentId: string, question: string): Promise<CopilotAnswer> {
    const incident = await this.incidentService.findById(incidentId);
    if (!incident) {
      return {
        answer: "Incident not found.",
        citations: [],
        usedFallback: true,
        source: "backend",
        modelUsed: "backend_fallback"
      };
    }

    const answer = await this.aiInferenceService.answerCopilotQuestion({
      incidentId: incident.id,
      summary: incident.summary,
      sourceFamilies: incident.sourceFamilies,
      recommendedActions: incident.recommendedActions,
      timeline: incident.timeline,
      evidence: incident.evidence,
      question
    });

    if (answer) {
      await this.incidentService.recordCopilotMetadata(incident.id, answer);
      return {
        answer: answer.content,
        citations: answer.citations ?? [],
        usedFallback: answer.fallbackUsed,
        source: toCopilotSource(answer.modelUsed, answer.fallbackUsed),
        modelUsed: answer.modelUsed
      };
    }

    return {
      answer: `Incident ${incident.id} is ${incident.severity} severity, currently ${incident.status}. Recommended actions: ${incident.recommendedActions.join("; ")}.`,
      citations: incident.evidence[0] ? [incident.evidence[0].citationId] : [],
      usedFallback: true,
      source: "backend",
      modelUsed: "backend_fallback"
    };
  }
}
