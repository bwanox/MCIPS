import { apiClient } from "../lib/api-client";
import type { Incident } from "../types/incident";

export const incidentsService = {
  async list(): Promise<Incident[]> {
    const response = await apiClient.get<Incident[]>("/api/incidents");
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
