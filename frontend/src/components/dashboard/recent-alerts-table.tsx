"use client";

import type { Alert } from "../../types/alert";

export const RecentAlertsTable = ({ alerts }: { alerts: Alert[] }) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <h2>Recent Alerts</h2>
        <p className="panel-subtext">Fast scan table for the most recent incidents in the SOC queue.</p>
      </div>
      <span className="badge">Sanitized only</span>
    </div>
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
            <th>Family</th>
            <th>Label</th>
            <th>Severity</th>
            <th>Preview</th>
            <th>Model</th>
          </tr>
        </thead>
        <tbody>
          {alerts.slice(0, 10).map((alert) => (
            <tr key={alert.id}>
              <td>{new Date(alert.timestamp).toLocaleString()}</td>
              <td>
                <span className="table-title">{alert.eventType}</span>
                <span className="table-subtext">{alert.source}</span>
              </td>
              <td>{alert.datasetFamily}</td>
              <td>
                <span className="table-title">{alert.label}</span>
                <span className="table-subtext">{alert.risk}</span>
              </td>
              <td>{alert.severity}</td>
              <td>{alert.sanitizedPreview}</td>
              <td>
                <span className="table-title">{alert.modelUsed}</span>
                <span className="table-subtext">{Math.round(alert.confidence * 100)}% confidence</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
