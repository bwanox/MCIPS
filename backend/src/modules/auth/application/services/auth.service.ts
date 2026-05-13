import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../../../../shared/config/env.js";
import { HttpError } from "../../../../shared/presentation/error-middleware.js";

export interface AuthUser {
  email: string;
}

export class AuthService {
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== env.adminEmail.toLowerCase()) {
      throw new HttpError(401, "Invalid credentials");
    }

    const valid = await bcrypt.compare(password, env.adminPasswordHash);
    if (!valid) {
      throw new HttpError(401, "Invalid credentials");
    }

    const user = { email: env.adminEmail };
    const token = jwt.sign(user, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
    });
    return { token, user };
  }

  verify(token: string): AuthUser {
    try {
      return jwt.verify(token, env.jwtSecret) as AuthUser;
    } catch {
      throw new HttpError(401, "Invalid token");
    }
  }
}
