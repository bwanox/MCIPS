import { apiClient } from "../lib/api-client";
import type { Alert } from "../types/alert";

export const alertsService = {
  async list(): Promise<Alert[]> {
    const response = await apiClient.get<Alert[]>("/api/alerts");
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
