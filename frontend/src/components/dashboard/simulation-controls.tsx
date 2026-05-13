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
      <h2>Simulator</h2>
      <span className={`badge ${status?.running ? "badge-live" : ""}`}>
        {status?.running ? "Running" : "Stopped"}
      </span>
    </div>
    <p>Last alert: {status?.lastAlertAt ? new Date(status.lastAlertAt).toLocaleString() : "none"}</p>
    <div className="button-row">
      <button onClick={onStart}>Start</button>
      <button onClick={onStop}>Stop</button>
      <button onClick={onOnce}>Run Once</button>
    </div>
  </section>
);
