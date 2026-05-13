export interface AuthUser {
  email: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
