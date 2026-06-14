export interface AuthUser {
  email: string;
  tenantId: string;
  role: "admin";
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
