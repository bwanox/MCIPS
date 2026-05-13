"use client";

import type { StatsSummary } from "../../types/stats";

export const TopFeatures = ({ summary }: { summary: StatsSummary | null }) => (
  <section className="panel">
    <div className="panel-header">
      <h2>Top Features</h2>
      <span className="badge">Model signals</span>
    </div>
    <div className="feature-list">
      {summary?.topFeatures.map((item) => (
        <div key={item.feature} className="feature-row">
          <span>{item.feature}</span>
          <strong>{item.count}</strong>
        </div>
      )) ?? <p>No features yet.</p>}
    </div>
  </section>
);
