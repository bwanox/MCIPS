"use client";

import type { StatsSummary } from "../../types/stats";

export const StatusCards = ({ summary }: { summary: StatsSummary | null }) => {
  const cards = [
    {
      label: "Total Alerts",
      value: summary?.totalAlerts ?? 0,
      detail: "Unified cross-family detections",
      trend: "Live telemetry"
    },
    {
      label: "High Risk",
      value: summary?.highRiskAlerts ?? 0,
      detail: "Priority incidents requiring triage",
      trend: "Critical queue"
    },
    {
      label: "Medium Risk",
      value: summary?.mediumRiskAlerts ?? 0,
      detail: "Needs analyst review and context",
      trend: "Watch closely"
    },
    {
      label: "Average Confidence",
      value: summary ? `${Math.round(summary.averageConfidence * 100)}%` : "0%",
      detail: "Model certainty across recent alerts",
      trend: "Signal quality"
    }
  ];

  return (
    <div className="status-grid">
      {cards.map((card) => (
        <article key={card.label} className="panel metric-card">
          <div className="stat-card-top">
            <span>{card.label}</span>
            <div className="metric-trend">{card.trend}</div>
          </div>
          <strong>{card.value}</strong>
          <p className="metric-detail">{card.detail}</p>
        </article>
      ))}
    </div>
  );
};
