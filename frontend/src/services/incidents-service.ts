import { apiClient } from "../lib/api-client";
import type { Incident, PaginatedResult } from "../types/incident";

export const incidentsService = {
  async list(page = 1, limit = 20): Promise<PaginatedResult<Incident>> {
    const response = await apiClient.get<PaginatedResult<Incident>>("/api/incidents", { params: { page, limit } });
    return response.data;
  },
  async get(id: string): Promise<Incident> {
    const response = await apiClient.get<Incident>(`/api/incidents/${id}`);
    return response.data;
  },
  async approveAction(incidentId: string, actionId: string): Promise<Incident> {
    const response = await apiClient.post<Incident>(`/api/incidents/${incidentId}/actions/${actionId}/approve`);
    return response.data;
  },
  async rejectAction(incidentId: string, actionId: string): Promise<Incident> {
    const response = await apiClient.post<Incident>(`/api/incidents/${incidentId}/actions/${actionId}/reject`);
    return response.data;
  }
};
