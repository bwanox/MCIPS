"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "../../services/auth-service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@mcips.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div>
          <p className="eyebrow">MCIPS</p>
          <h1>Security Operations Console</h1>
          <p>JWT-authenticated realtime dashboard. Raw content is never rendered here.</p>
        </div>
        <form
          className="manual-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            try {
              const response = await authService.login(email, password);
              window.localStorage.setItem("mcips_token", response.token);
              router.replace("/dashboard");
            } catch {
              setError("Invalid credentials");
            }
          }}
        >
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          <button type="submit">Login</button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
