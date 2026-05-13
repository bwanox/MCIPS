"use client";

import type { Alert } from "../../types/alert";

const severityClass: Record<Alert["severity"], string> = {
  critical: "severity-critical",
  high: "severity-high",
  medium: "severity-medium",
  low: "severity-low"
};

export const LiveFeed = ({ alerts }: { alerts: Alert[] }) => (
  <section className="panel">
    <div className="panel-header">
      <h2>Live Feed</h2>
      <span className="badge">Privacy protected</span>
    </div>
    <div className="feed-list">
      {alerts.slice(0, 8).map((alert) => (
        <article key={alert.id} className={`feed-item ${severityClass[alert.severity]}`}>
          <div className="feed-topline">
            <strong>{alert.title}</strong>
            <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="tag-row">
            <span className="badge">{alert.eventType}</span>
            <span className="badge">{alert.datasetFamily}</span>
            <span className="badge">{alert.severity}</span>
          </div>
          <p>{alert.sanitizedPreview}</p>
          <p>{alert.explanation}</p>
          <div className="tag-row">
            <span className="badge">{alert.label}</span>
            <span className="badge">{alert.risk}</span>
            <span className="badge">{alert.confidence.toFixed(2)}</span>
            <span className="badge">{alert.modelUsed}</span>
            {alert.piiDetected ? <span className="badge">PII masked</span> : null}
            {alert.detectedBank ? <span className="badge">{alert.detectedBank}</span> : null}
            {alert.fallbackUsed ? <span className="badge badge-warn">AI fallback</span> : null}
            {alert.features.map((feature) => (
              <span key={feature} className="badge">
                {feature}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  </section>
);
