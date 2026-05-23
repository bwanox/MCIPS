import { apiClient } from "../lib/api-client";
import type { CopilotAnswer, CopilotFeedItem } from "../types/incident";

export const copilotService = {
  async feed(): Promise<CopilotFeedItem[]> {
    const response = await apiClient.get<CopilotFeedItem[]>("/api/copilot/feed");
    return response.data;
  },
  async query(incidentId: string, question: string): Promise<CopilotAnswer> {
    const response = await apiClient.post<CopilotAnswer>("/api/copilot/query", {
      incidentId,
      question
    });
    return response.data;
  }
};
