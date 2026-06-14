import { apiClient } from "../lib/api-client";
import type { Alert } from "../types/alert";
import type { PaginatedResult } from "../types/incident";

export const alertsService = {
  async list(page = 1, limit = 20): Promise<PaginatedResult<Alert>> {
    const response = await apiClient.get<PaginatedResult<Alert>>("/api/alerts", { params: { page, limit } });
    return response.data;
  },
  async recent(): Promise<Alert[]> {
    const response = await apiClient.get<Alert[]>("/api/alerts/recent");
    return response.data;
  },
  async exportIncident(alertId: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`/api/alerts/${alertId}/export`);
    return response.data;
  }
};
