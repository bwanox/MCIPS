import { apiClient } from "../lib/api-client";
import type { Alert } from "../types/alert";
import type { SimulationStatus } from "../types/simulation";

export const simulationService = {
  async start(): Promise<SimulationStatus> {
    const response = await apiClient.post<SimulationStatus>("/api/simulation/start");
    return response.data;
  },
  async stop(): Promise<SimulationStatus> {
    const response = await apiClient.post<SimulationStatus>("/api/simulation/stop");
    return response.data;
  },
  async status(): Promise<SimulationStatus> {
    const response = await apiClient.get<SimulationStatus>("/api/simulation/status");
    return response.data;
  },
  async once(): Promise<Alert> {
    const response = await apiClient.post<Alert>("/api/simulation/once");
    return response.data;
  }
};
