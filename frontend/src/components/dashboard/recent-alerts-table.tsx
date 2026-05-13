"use client";

import type { Alert } from "../../types/alert";

export const RecentAlertsTable = ({ alerts }: { alerts: Alert[] }) => (
  <section className="panel">
    <div className="panel-header">
      <h2>Recent Alerts</h2>
      <span className="badge">Sanitized only</span>
    </div>
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
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
              <td>{alert.eventType}</td>
              <td>{alert.label}</td>
              <td>{alert.severity}</td>
              <td>{alert.sanitizedPreview}</td>
              <td>{alert.modelUsed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
