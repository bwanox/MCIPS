"use client";

import type { StatsSummary } from "../../types/stats";

export const TopFeatures = ({ summary }: { summary: StatsSummary | null }) => (
  <section className="dashboard-main dashboard-main-equal">
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Top Detector Signals</h2>
          <p className="panel-subtext">Most common model or rule outputs across the live threat stream.</p>
        </div>
        <span className="badge">Signal triggers</span>
      </div>
      <div className="feature-list">
        {summary?.topFeatures.length ? (
          summary.topFeatures.map((item) => (
            <div key={item.feature} className="feature-row">
              <div>
                <div className="feature-name">{item.feature}</div>
                <div className="feature-meta">Triggered in recent alert reasoning</div>
              </div>
              <strong>{item.count}</strong>
            </div>
          ))
        ) : (
          <p className="empty-state">No detector signals yet.</p>
        )}
      </div>
    </div>
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Top Risk Factors</h2>
          <p className="panel-subtext">Explainable scoring factors that most often drive escalation.</p>
        </div>
        <span className="badge">Visible scoring</span>
      </div>
      <div className="feature-list">
        {summary?.topRiskFactors.length ? (
          summary.topRiskFactors.map((item) => (
            <div key={item.factor} className="feature-row">
              <div>
                <div className="feature-name">{item.factor.replaceAll("_", " ")}</div>
                <div className="feature-meta">Used by the correlation and scoring layer</div>
              </div>
              <strong>{item.count}</strong>
            </div>
          ))
        ) : (
          <p className="empty-state">No explainable scoring factors yet.</p>
        )}
      </div>
    </div>
  </section>
);
