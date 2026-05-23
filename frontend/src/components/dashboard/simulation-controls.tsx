"use client";

import type { SimulationStatus } from "../../types/simulation";

export const SimulationControls = ({
  status,
  onStart,
  onStop,
  onOnce,
  onScenario
}: {
  status: SimulationStatus | null;
  onStart: () => void;
  onStop: () => void;
  onOnce: () => void;
  onScenario: () => void;
}) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <h2>Perfect Demo Scenario</h2>
        <p className="panel-subtext">Run one Morocco-relevant phishing SMS to suspicious login story through the exact same production pipeline.</p>
      </div>
      <span className={`badge ${status?.running ? "badge-live" : ""}`}>
        {status?.running ? "Running" : "Stopped"}
      </span>
    </div>
    <div className="status-stack">
      <div className="status-pill">
        <span className="eyebrow">Scenario</span>
        <strong>{status?.scenario ?? "phishing-login"}</strong>
      </div>
      <div className="status-pill">
        <span className="eyebrow">Last Run</span>
        <strong>{status?.lastRunAt ? new Date(status.lastRunAt).toLocaleString() : "No run yet"}</strong>
      </div>
      <div className="status-pill">
        <span className="eyebrow">Last Alert</span>
        <strong>{status?.lastAlertAt ? new Date(status.lastAlertAt).toLocaleString() : "No activity yet"}</strong>
      </div>
      <div className="status-pill">
        <span className="eyebrow">Interval</span>
        <strong>{status?.intervalMs ? `${Math.round(status.intervalMs / 1000)}s cadence` : "Idle"}</strong>
      </div>
    </div>
    <div className="button-row">
      <button onClick={onScenario}>Run Moroccan Bank Phishing Scenario</button>
      <button className="secondary-button" onClick={onStart}>Start Scenario Loop</button>
      <button className="secondary-button" onClick={onStop}>Stop Stream</button>
      <button className="ghost-button" onClick={onOnce}>Run Scenario Once</button>
    </div>
  </section>
);
