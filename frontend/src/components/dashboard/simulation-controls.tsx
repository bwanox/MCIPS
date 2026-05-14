"use client";

import type { SimulationStatus } from "../../types/simulation";

export const SimulationControls = ({
  status,
  onStart,
  onStop,
  onOnce
}: {
  status: SimulationStatus | null;
  onStart: () => void;
  onStop: () => void;
  onOnce: () => void;
}) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <h2>Demo Scenario Engine</h2>
        <p className="panel-subtext">Drive Morocco-relevant threat examples through the exact same realtime pipeline.</p>
      </div>
      <span className={`badge ${status?.running ? "badge-live" : ""}`}>
        {status?.running ? "Running" : "Stopped"}
      </span>
    </div>
    <div className="status-stack">
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
      <button onClick={onStart}>Start Demo Stream</button>
      <button className="secondary-button" onClick={onStop}>Stop Stream</button>
      <button className="ghost-button" onClick={onOnce}>Run Next Scenario Step</button>
    </div>
  </section>
);
