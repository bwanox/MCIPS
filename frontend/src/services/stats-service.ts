import { apiClient } from "../lib/api-client";
import type { StatsSummary, TimelinePoint } from "../types/stats";

export const statsService = {
  async summary(): Promise<StatsSummary> {
    const response = await apiClient.get<StatsSummary>("/api/stats/summary");
    return response.data;
  },
  async timeline(range: "today" | "week" | "month"): Promise<TimelinePoint[]> {
    const response = await apiClient.get<TimelinePoint[]>("/api/stats/timeline", {
      params: { range }
    });
    return response.data;
  }
};
