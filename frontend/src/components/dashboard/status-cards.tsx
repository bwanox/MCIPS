"use client";

import type { StatsSummary } from "../../types/stats";

export const StatusCards = ({ summary }: { summary: StatsSummary | null }) => {
  const cards = [
    {
      label: "Total Signals",
      value: summary?.totalAlerts ?? 0,
      detail: "Unified detections entering the SecureLens pipeline",
      trend: "Live telemetry"
    },
    {
      label: "Correlated Incidents",
      value: summary?.correlatedIncidentsCount ?? 0,
      detail: "Signals linked into higher-confidence compromise stories",
      trend: "Correlation engine"
    },
    {
      label: "High-Risk Queue",
      value: summary?.highRiskAlerts ?? 0,
      detail: "Incidents demanding fast analyst attention or immediate action",
      trend: "Priority focus"
    },
    {
      label: "Average Confidence",
      value: summary ? `${Math.round(summary.averageConfidence * 100)}%` : "0%",
      detail: "Hybrid detector certainty across the current incident stream",
      trend: "Explainable scoring"
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
