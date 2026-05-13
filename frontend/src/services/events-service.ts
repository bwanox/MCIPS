import { apiClient } from "../lib/api-client";
import type { Alert } from "../types/alert";
import type { EventTypesResponse, UnifiedEventEnvelope } from "../types/event";

export type EventSubmission = UnifiedEventEnvelope;

export const eventsService = {
  async submit(payload: EventSubmission): Promise<Alert> {
    const response = await apiClient.post<Alert>("/api/events", payload);
    return response.data;
  },
  async submitBatch(payload: EventSubmission[]): Promise<Alert[]> {
    const response = await apiClient.post<Alert[]>("/api/events/batch", payload);
    return response.data;
  },
  async getTypes(): Promise<EventTypesResponse> {
    const response = await apiClient.get<EventTypesResponse>("/api/events/types");
    return response.data;
  }
};
