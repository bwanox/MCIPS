import { apiClient } from "../lib/api-client";
import type { Alert } from "../types/alert";

export interface EventSubmission {
  type: "SMS" | "EMAIL" | "TEXT" | "LOGIN_ATTEMPT";
  source: "manual";
  content: string;
  ipAddress?: string;
  country?: string;
  device?: string;
  userAgent?: string;
}

export const eventsService = {
  async submit(payload: EventSubmission): Promise<Alert> {
    const response = await apiClient.post<Alert>("/api/events", payload);
    return response.data;
  }
};
