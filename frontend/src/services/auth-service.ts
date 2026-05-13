import { apiClient } from "../lib/api-client";
import type { LoginResponse } from "../types/auth";

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>("/api/auth/login", { email, password });
    return response.data;
  },
  async me(): Promise<{ user: { email: string } }> {
    const response = await apiClient.get("/api/auth/me");
    return response.data;
  },
  async logout(): Promise<void> {
    await apiClient.post("/api/auth/logout");
  }
};
