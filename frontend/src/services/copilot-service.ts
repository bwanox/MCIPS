import { apiClient } from "../lib/api-client";
import type { CopilotAnswer, CopilotFeedItem, PaginatedResult } from "../types/incident";

export const copilotService = {
  async feed(page = 1, limit = 20): Promise<PaginatedResult<CopilotFeedItem>> {
    const response = await apiClient.get<PaginatedResult<CopilotFeedItem>>("/api/copilot/feed", { params: { page, limit } });
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
