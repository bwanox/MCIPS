"use client";

import type { StatsSummary } from "../../types/stats";

export const TopFeatures = ({ summary }: { summary: StatsSummary | null }) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <h2>Top Features</h2>
        <p className="panel-subtext">Most common detection signals and rule/model triggers.</p>
      </div>
      <span className="badge">Model signals</span>
    </div>
    <div className="feature-list">
      {summary?.topFeatures.map((item) => (
        <div key={item.feature} className="feature-row">
          <div>
            <div className="feature-name">{item.feature}</div>
            <div className="feature-meta">Triggered in recent alert reasoning</div>
          </div>
          <strong>{item.count}</strong>
        </div>
      )) ?? <p className="empty-state">No features yet.</p>}
    </div>
  </section>
);
