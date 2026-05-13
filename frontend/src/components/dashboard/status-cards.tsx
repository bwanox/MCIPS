"use client";

import type { StatsSummary } from "../../types/stats";

export const StatusCards = ({ summary }: { summary: StatsSummary | null }) => {
  const cards = [
    { label: "Total Alerts", value: summary?.totalAlerts ?? 0 },
    { label: "High Risk", value: summary?.highRiskAlerts ?? 0 },
    { label: "Phishing", value: summary?.phishingCount ?? 0 },
    { label: "Suspicious Login", value: summary?.suspiciousLoginCount ?? 0 }
  ];

  return (
    <div className="status-grid">
      {cards.map((card) => (
        <article key={card.label} className="panel metric-card">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </div>
  );
};
