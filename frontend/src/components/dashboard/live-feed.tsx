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
        <h2>Live Incident Feed</h2>
        <p className="panel-subtext">Follow the phishing SMS to suspicious login story as it becomes one correlated, sanitized incident.</p>
      </div>
      <span className="badge">Privacy protected</span>
    </div>
    <div className="feed-list">
      {alerts.length === 0 ? <p className="empty-state">No incidents yet. Run the Moroccan bank phishing scenario to populate the feed.</p> : null}
      {alerts.slice(0, 8).map((alert) => {
        const factorPreview = alert.explainableRisk.factors.slice(0, 3);

        return (
          <article key={alert.id} className={`feed-item ${severityClass[alert.severity]}`}>
            <div className="feed-topline">
              <div>
                <strong>{alert.title}</strong>
                <div className="tag-row tag-row-tight">
                  <span className={`badge severity-chip ${severityClass[alert.severity]}`}>{alert.severity}</span>
                  <span className="badge">{alert.datasetFamily}</span>
                  <span className="badge">{alert.eventType}</span>
                  {alert.correlationDetected ? <span className="badge badge-live">Correlated</span> : null}
                </div>
              </div>
              <span className="feed-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="feed-grid">
              <div className="feed-primary">
                <p className="feed-summary">{alert.incidentSummary || alert.sanitizedPreview}</p>
                <p className="feed-caption">{alert.sanitizedPreview}</p>
                <div className="confidence-track">
                  <div className="confidence-bar" style={{ width: `${Math.max(8, Math.round(alert.confidence * 100))}%` }} />
                </div>
              </div>
              <div className="feed-secondary">
                <div className="feed-score-grid">
                  <div className="status-pill status-pill-compact">
                    <span className="eyebrow">Risk score</span>
                    <strong>{alert.explainableRisk.finalScore}/100</strong>
                  </div>
                  <div className="status-pill status-pill-compact">
                    <span className="eyebrow">Signals linked</span>
                    <strong>{alert.correlatedSignals.length + 1}</strong>
                  </div>
                </div>
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
                <span className="feed-meta-label">Model and privacy</span>
                <div className="tag-row tag-row-tight">
                  <span className="badge">{alert.modelUsed}</span>
                  {alert.fallbackUsed ? <span className="badge badge-warn">Fallback</span> : null}
                  {alert.piiDetected ? <span className="badge">PII masked</span> : null}
                  {alert.detectedBank ? <span className="badge">{alert.detectedBank}</span> : null}
                </div>
              </div>
            </div>
            <div className="feed-meta-grid">
              <div className="feed-meta-block">
                <span className="feed-meta-label">Scoring factors</span>
                <div className="feature-list compact-list">
                  {factorPreview.map((factor) => (
                    <div key={factor.key} className="feature-row feature-row-compact">
                      <div>
                        <div className="feature-name">{factor.label}</div>
                        <div className="feature-meta">{factor.detail}</div>
                      </div>
                      <strong>+{factor.weight}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="feed-meta-block">
                <span className="feed-meta-label">Recommended actions</span>
                <div className="action-list compact-list">
                  {alert.recommendedActions.slice(0, 3).map((action) => (
                    <div key={action} className="action-row">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {alert.features.length > 0 ? (
              <div className="feed-feature-row">
                <span className="feed-meta-label">Detector signals</span>
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
        );
      })}
    </div>
  </section>
);
