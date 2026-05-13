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
      <div>
        <h2>Live Alert Feed</h2>
        <p className="panel-subtext">Sanitized incident cards with model reasoning and analyst-friendly context.</p>
      </div>
      <span className="badge">Privacy protected</span>
    </div>
    <div className="feed-list">
      {alerts.slice(0, 8).map((alert) => (
        <article key={alert.id} className={`feed-item ${severityClass[alert.severity]}`}>
          <div className="feed-topline">
            <div>
              <strong>{alert.title}</strong>
              <div className="tag-row tag-row-tight">
                <span className={`badge severity-chip ${severityClass[alert.severity]}`}>{alert.severity}</span>
                <span className="badge">{alert.eventType}</span>
                <span className="badge">{alert.datasetFamily}</span>
              </div>
            </div>
            <span className="feed-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="feed-grid">
            <div className="feed-primary">
              <p className="feed-summary">{alert.sanitizedPreview}</p>
              <div className="confidence-track">
                <div className="confidence-bar" style={{ width: `${Math.max(8, Math.round(alert.confidence * 100))}%` }} />
              </div>
            </div>
            <div className="feed-secondary">
              <p className="feed-explanation">{alert.explanation}</p>
            </div>
          </div>
          <div className="feed-meta-grid">
            <div className="feed-meta-block">
              <span className="feed-meta-label">Assessment</span>
              <div className="tag-row tag-row-tight">
                <span className="badge">{alert.label}</span>
                <span className="badge">{alert.risk}</span>
                <span className="badge">{Math.round(alert.confidence * 100)}% confidence</span>
              </div>
            </div>
            <div className="feed-meta-block">
              <span className="feed-meta-label">Model</span>
              <div className="tag-row tag-row-tight">
                <span className="badge">{alert.modelUsed}</span>
                {alert.fallbackUsed ? <span className="badge badge-warn">Fallback</span> : null}
                {alert.piiDetected ? <span className="badge">PII masked</span> : null}
                {alert.detectedBank ? <span className="badge">{alert.detectedBank}</span> : null}
              </div>
            </div>
          </div>
          {alert.features.length > 0 ? (
            <div className="feed-feature-row">
              <span className="feed-meta-label">Signals</span>
              <div className="tag-row tag-row-tight">
                {alert.features.map((feature) => (
                  <span key={feature} className="badge">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  </section>
);
