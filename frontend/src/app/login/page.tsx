"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "../../services/auth-service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@mcips.local");
  const [password, setPassword] = useState("admin123");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-story">
          <div>
            <p className="eyebrow">MCIPS SecureLens</p>
            <h1>Privacy-first cyber defense for smaller teams.</h1>
            <p>
              MCIPS SecureLens helps SMEs and small institutions without dedicated cybersecurity teams detect phishing
              lures, suspicious logins, and network compromise signals without exposing sensitive personal data.
            </p>
          </div>
          <div className="login-story-grid">
            <div className="login-story-card">
              <span>3-signal MVP</span>
              <strong>Phishing messages, suspicious logins, and network anomaly detection.</strong>
            </div>
            <div className="login-story-card">
              <span>Privacy-by-design</span>
              <strong>Sanitize before storage, AI explanation, and dashboard display.</strong>
            </div>
            <div className="login-story-card">
              <span>Explainable scoring</span>
              <strong>Visible risk factors show why an incident was escalated.</strong>
            </div>
            <div className="login-story-card">
              <span>Morocco relevance</span>
              <strong>Built around fake bank SMS, OTP lures, and institutional login traps.</strong>
            </div>
          </div>
        </div>
        <div className="login-form-wrap">
          <div>
            <p className="eyebrow">Operator access</p>
            <h2>Sign in to MCIPS SecureLens</h2>
            <p className="panel-subtext">
              The development workspace uses prefilled local credentials so you can go directly into the competition
              demo flow.
            </p>
          </div>
          <form
            className="manual-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);
              setError(null);

              try {
                const response = await authService.login(email, password);
                window.localStorage.setItem("mcips_token", response.token);
                router.replace("/dashboard");
              } catch {
                setError("Unable to sign in with the current credentials.");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
            <label>
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="status-pill status-pill-light">
              <span className="eyebrow">Default local credentials</span>
              <strong>admin@mcips.local / admin123</strong>
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Open SecureLens Dashboard"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
