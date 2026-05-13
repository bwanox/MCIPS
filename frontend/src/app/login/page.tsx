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
        <div className="login-story">
          <div>
            <p className="eyebrow">MCIPS command surface</p>
            <h1>Security Operations Console</h1>
            <p>
              Unified monitoring for phishing SMS, login attempts, phishing feature events, intrusion telemetry,
              and anomaly streams. Sensitive content is sanitized before storage, AI analysis, or dashboard rendering.
            </p>
          </div>
          <div className="login-story-grid">
            <div className="login-story-card">
              <span>Realtime pipeline</span>
              <strong>Normalize, sanitize, score, alert, stream.</strong>
            </div>
            <div className="login-story-card">
              <span>Coverage</span>
              <strong>Dataset and natural-language event families in one console.</strong>
            </div>
            <div className="login-story-card">
              <span>Storage posture</span>
              <strong>Sanitized payloads only by default.</strong>
            </div>
            <div className="login-story-card">
              <span>Operator mode</span>
              <strong>Built for triage, live monitoring, and simulation drills.</strong>
            </div>
          </div>
        </div>
        <div className="login-form-wrap">
          <div>
            <p className="eyebrow">Operator access</p>
            <h2>Sign in to the dashboard</h2>
            <p className="panel-subtext">Default local credentials are prefilled for the development environment.</p>
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
            <button type="submit">Enter SOC Dashboard</button>
            {error ? <p className="error-text">{error}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
