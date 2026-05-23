import { apiClient } from "../lib/api-client";

export interface SystemHealth {
  backend: string;
  aiUrl: string;
  agentUrl?: string;
  agent?: {
    online: boolean;
    service: string;
    backendReachable: boolean;
    queueDepth: number;
    lastEventForwardedAt?: string;
    lastActionExecutedAt?: string;
    lastActionArtifactPaths?: string[];
    collectors: Array<{
      name: string;
      path: string;
      healthy: boolean;
      lastEventAt?: string;
      error?: string;
    }>;
    message: string;
  };
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
