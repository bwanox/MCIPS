import { apiClient } from "../lib/api-client";

export interface SystemHealth {
  backend: string;
  aiUrl: string;
  dbMode: string;
  databaseConnected: boolean;
  databaseError?: string;
  timestamp: string;
}

export const systemService = {
  async health(): Promise<SystemHealth> {
    const response = await apiClient.get<SystemHealth>("/health");
    return response.data;
  }
};
