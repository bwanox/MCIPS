"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";

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
          <div className="login-brand">
            <span className="login-brand-mark">
              <ShieldCheck size={22} />
            </span>
            <div>
              <strong>SecureLens</strong>
              <span>by MCIPS</span>
            </div>
          </div>
          <div className="login-story-copy">
            <p className="eyebrow">Security operations, simplified</p>
            <h1>Clarity for every security decision.</h1>
            <p>
              Detect threats, understand the evidence, and respond with confidence from one privacy-first workspace.
            </p>
          </div>
          <div className="login-benefits">
            <span><Check size={16} /> Explainable AI decisions</span>
            <span><Check size={16} /> Privacy-safe evidence</span>
            <span><Check size={16} /> Human-controlled response</span>
          </div>
        </div>
        <div className="login-form-wrap">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to your workspace</h2>
            <p className="panel-subtext">
              Monitor incidents and coordinate your response team.
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
            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Open SecureLens Dashboard"}
              {!submitting ? <ArrowRight size={18} /> : null}
            </button>
            <p className="login-helper">Local demo access is prefilled for this environment.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
