"use client";

import type { Alert } from "../../types/alert";

export const RecentAlertsTable = ({ alerts }: { alerts: Alert[] }) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <h2>Recent Incident Queue</h2>
        <p className="panel-subtext">Fast triage table for the polished phishing SMS to suspicious login walkthrough.</p>
      </div>
      <span className="badge">Sanitized only</span>
    </div>
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Incident</th>
            <th>Signal</th>
            <th>Assessment</th>
            <th>Severity</th>
            <th>Explainable Score</th>
            <th>Privacy-safe evidence</th>
          </tr>
        </thead>
        <tbody>
          {alerts.slice(0, 10).map((alert) => (
            <tr key={alert.id}>
              <td>{new Date(alert.timestamp).toLocaleString()}</td>
              <td>
                <span className="table-title">{alert.title}</span>
                <span className="table-subtext">{alert.incidentType.replaceAll("_", " ")}</span>
              </td>
              <td>
                <span className="table-title">{alert.datasetFamily}</span>
                <span className="table-subtext">{alert.eventType}</span>
              </td>
              <td>
                <span className="table-title">{alert.label}</span>
                <span className="table-subtext">
                  {alert.risk} • {Math.round(alert.confidence * 100)}% confidence
                </span>
              </td>
              <td>
                <span className="table-title">{alert.severity}</span>
                <span className="table-subtext">{alert.correlationDetected ? "correlated incident" : alert.source}</span>
              </td>
              <td>
                <span className="table-title">{alert.explainableRisk.finalScore}/100</span>
                <span className="table-subtext">+{alert.explainableRisk.correlationBonus} correlation bonus</span>
              </td>
              <td>{alert.sanitizedPreview}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
