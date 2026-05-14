"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ChartsPanel } from "../../components/dashboard/charts-panel";
import { LiveFeed } from "../../components/dashboard/live-feed";
import { ManualEventForm } from "../../components/dashboard/manual-event-form";
import { RecentAlertsTable } from "../../components/dashboard/recent-alerts-table";
import { SimulationControls } from "../../components/dashboard/simulation-controls";
import { StatusCards } from "../../components/dashboard/status-cards";
import { TopFeatures } from "../../components/dashboard/top-features";
import { useAuth } from "../../hooks/use-auth";
import { useDashboardSocket } from "../../hooks/use-dashboard-socket";
import { alertsService } from "../../services/alerts-service";
import { authService } from "../../services/auth-service";
import { eventsService, type EventSubmission } from "../../services/events-service";
import { simulationService } from "../../services/simulation-service";
import { statsService } from "../../services/stats-service";
import { systemService, type SystemHealth } from "../../services/system-service";
import type { Alert } from "../../types/alert";
import type { DatasetFamily, RiskFactor, RiskLevel, ThreatLabel } from "../../types/alert";
import type { SimulationStatus } from "../../types/simulation";
import type { StatsSummary, TimelinePoint } from "../../types/stats";
import type { CyberEventType, EventSource } from "../../types/event";

type DashboardSection = "overview" | "incidents" | "signals" | "demo-lab";

const protectionCards = [
  {
    title: "Phishing Message Protection",
    description: "Detects fake CIH and Attijariwafa-style SMS or phishing emails while masking OTPs, links, and personal data."
  },
  {
    title: "Suspicious Login Detection",
    description: "Flags post-phishing access attempts from new IPs, devices, or impossible access patterns before they escalate."
  },
  {
    title: "Network Intrusion Awareness",
    description: "Scores intrusion and anomaly signals locally so smaller organizations still get high-value alerts even during AI fallback."
  }
];

const moroccoExamples = [
  "Fake CIH / Attijariwafa SMS requesting OTP confirmation",
  "Fake university or institution login page lure",
  "Suspicious login right after a phishing message",
  "Institution-targeted network intrusion telemetry"
];

const downloadJson = (filename: string, payload: Record<string, unknown>): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const SpotlightIncident = ({
  alert,
  onExport
}: {
  alert: Alert | null;
  onExport: (alert: Alert) => Promise<void>;
}) => {
  if (!alert) {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Latest Critical Incident</h2>
            <p className="panel-subtext">This area will surface the strongest correlated incident in the current tenant stream.</p>
          </div>
        </div>
        <p className="empty-state">No correlated incident yet. Trigger the phishing SMS + suspicious login scenario in Demo Lab.</p>
      </section>
    );
  }

  const topFactors = alert.explainableRisk.factors.slice(0, 4);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Latest Critical Incident</h2>
          <p className="panel-subtext">{alert.incidentType.replaceAll("_", " ")} incident for {alert.tenantId}</p>
        </div>
        <div className="button-row">
          <span className={`badge severity-chip severity-${alert.severity}`}>{alert.severity}</span>
          <button className="secondary-button" type="button" onClick={() => void onExport(alert)}>
            Export JSON
          </button>
        </div>
      </div>
      <div className="incident-spotlight-grid">
        <div className="incident-spotlight-copy">
          <p className="eyebrow">Incident summary</p>
          <h3>{alert.title}</h3>
          <p className="feed-summary">{alert.incidentSummary}</p>
          <div className="tag-row">
            <span className="badge">{alert.datasetFamily}</span>
            <span className="badge">{alert.label}</span>
            <span className="badge">{alert.risk}</span>
            <span className="badge">{alert.modelUsed}</span>
            {alert.detectedBank ? <span className="badge">{alert.detectedBank}</span> : null}
          </div>
        </div>
        <div className="incident-spotlight-metrics">
          <div className="status-pill">
            <span className="eyebrow">Explainable risk</span>
            <strong>{alert.explainableRisk.finalScore}/100</strong>
          </div>
          <div className="status-pill">
            <span className="eyebrow">Correlation bonus</span>
            <strong>+{alert.explainableRisk.correlationBonus}</strong>
          </div>
          <div className="status-pill">
            <span className="eyebrow">Signals linked</span>
            <strong>{alert.correlatedSignals.length + 1}</strong>
          </div>
        </div>
      </div>
      <div className="feed-meta-grid">
        <div className="feed-meta-block">
          <span className="feed-meta-label">Top scoring factors</span>
          <div className="feature-list compact-list">
            {topFactors.map((factor: RiskFactor) => (
              <div key={factor.key} className="feature-row">
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
          <div className="action-list">
            {alert.recommendedActions.map((action) => (
              <div key={action} className="action-row">
                {action}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { loading, email } = useAuth(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>("Waiting for live status");
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [filters, setFilters] = useState<{
    risk: RiskLevel | "ALL";
    label: ThreatLabel | "ALL";
    datasetFamily: DatasetFamily | "ALL";
    eventType: CyberEventType | "ALL";
    source: EventSource | "ALL";
  }>({
    risk: "ALL",
    label: "ALL",
    datasetFamily: "ALL",
    eventType: "ALL",
    source: "ALL"
  });

  const refreshData = useCallback(() => {
    void Promise.all([
      alertsService.recent().then(setAlerts),
      statsService.summary().then(setSummary),
      statsService.timeline("today").then(setTimeline),
      simulationService.status().then(setSimulationStatus),
      systemService.health().then(setSystemHealth)
    ]);
  }, []);

  const handleSocketAlert = useCallback((alert: Alert) => {
    startTransition(() => {
      setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]);
    });
  }, []);

  const handleSocketStats = useCallback((nextSummary: StatsSummary) => {
    startTransition(() => setSummary(nextSummary));
  }, []);

  const handleSocketSimulation = useCallback((status: SimulationStatus) => {
    startTransition(() => setSimulationStatus(status));
  }, []);

  const handleSocketSystem = useCallback((status: unknown) => {
    startTransition(() => setSystemStatus(JSON.stringify(status)));
  }, []);

  useDashboardSocket({
    onAlert: handleSocketAlert,
    onStats: handleSocketStats,
    onSimulation: handleSocketSimulation,
    onSystem: handleSocketSystem
  });

  useEffect(() => {
    if (loading) {
      return;
    }

    refreshData();
  }, [loading, refreshData]);

  if (loading) {
    return <main className="dashboard-shell">Loading...</main>;
  }

  const handleManualSubmit = async (payload: EventSubmission) => {
    const alert = await eventsService.submit(payload);
    startTransition(() => {
      setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]);
    });
    refreshData();
  };

  const handleSimulationOnce = async () => {
    await simulationService.once();
    refreshData();
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filters.risk !== "ALL" && alert.risk !== filters.risk) return false;
    if (filters.label !== "ALL" && alert.label !== filters.label) return false;
    if (filters.datasetFamily !== "ALL" && alert.datasetFamily !== filters.datasetFamily) return false;
    if (filters.eventType !== "ALL" && alert.eventType !== filters.eventType) return false;
    if (filters.source !== "ALL" && alert.source !== filters.source) return false;
    return true;
  });

  const labelOptions = summary ? Object.keys(summary.labelDistribution) : [];
  const familyOptions = summary?.datasetFamilyDistribution.map((entry) => entry.family) ?? [];
  const eventTypeOptions = summary?.eventTypeDistribution.map((entry) => entry.eventType) ?? [];
  const latestCorrelatedIncident =
    alerts.find((alert) => alert.correlationDetected) ??
    alerts.find((alert) => alert.severity === "critical") ??
    null;

  const sectionCards: Array<{ id: DashboardSection; title: string; description: string; meta: string }> = [
    {
      id: "overview",
      title: "Overview",
      description: "Mission, system health, top protections, and the latest correlated incident.",
      meta: `${summary?.totalAlerts ?? 0} total signals`
    },
    {
      id: "incidents",
      title: "Incidents",
      description: "Live correlated incident flow, alert queue, and exportable response context.",
      meta: `${summary?.correlatedIncidentsCount ?? 0} correlated incidents`
    },
    {
      id: "signals",
      title: "Detection Signals",
      description: "Explainable scoring factors, model signals, and supporting detection distributions.",
      meta: `${summary?.topRiskFactors.length ?? 0} top scoring factors`
    },
    {
      id: "demo-lab",
      title: "Demo Lab",
      description: "Manual scenario injection and simulation controls for the competition walkthrough.",
      meta: simulationStatus?.running ? "Simulation active" : "Simulation idle"
    }
  ];

  const handleExport = async (alert: Alert) => {
    const payload = await alertsService.exportIncident(alert.id);
    downloadJson(`mcips-securelens-${alert.incidentId}.json`, payload);
  };

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <header className="panel hero-panel hero-primary">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">MCIPS SecureLens</p>
              <h1>Affordable cyber defense for smaller teams with privacy built in.</h1>
            </div>
            <div className="header-actions">
              <span className="badge badge-live">{email}</span>
              <button
                className="secondary-button"
                onClick={async () => {
                  await authService.logout();
                  window.localStorage.removeItem("mcips_token");
                  router.replace("/login");
                }}
              >
                Logout
              </button>
            </div>
          </div>
          <p className="hero-copy">
            MCIPS SecureLens helps SMEs and small institutions without dedicated cybersecurity teams detect phishing,
            suspicious logins, and network intrusions in real time, correlate them into a single incident view, and
            respond faster without exposing sensitive personal data.
          </p>
          <div className="hero-band">
            <div className="hero-chip">
              <span>Core signals</span>
              <strong>Phishing messages, suspicious logins, network anomalies</strong>
            </div>
            <div className="hero-chip">
              <span>Privacy-by-design</span>
              <strong>Sanitize before storage, AI explanation, and analyst display</strong>
            </div>
            <div className="hero-chip">
              <span>Morocco relevance</span>
              <strong>CIH / Attijariwafa scams, OTP lures, and institutional login traps</strong>
            </div>
          </div>
        </header>
        <aside className="panel hero-panel hero-secondary">
          <p className="eyebrow">System posture</p>
          <div className="hero-kpi-grid">
            <div className="hero-kpi">
              <span>Backend</span>
              <strong>{systemHealth?.backend ?? "pending"}</strong>
            </div>
            <div className="hero-kpi">
              <span>Data layer</span>
              <strong>{systemHealth?.databaseConnected ? "connected" : "check system"}</strong>
            </div>
            <div className="hero-kpi">
              <span>Correlated incidents</span>
              <strong>{summary?.correlatedIncidentsCount ?? 0}</strong>
            </div>
            <div className="hero-kpi">
              <span>Live status</span>
              <strong>{systemStatus.length > 42 ? `${systemStatus.slice(0, 42)}...` : systemStatus}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Workspace Sections</h2>
            <p className="panel-subtext">Keep the home screen focused, then move into the specific analyst workspace you need.</p>
          </div>
          <span className="badge">Competition flow</span>
        </div>
        <div className="section-card-grid">
          {sectionCards.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`section-card ${activeSection === section.id ? "section-card-active" : ""}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="eyebrow">{section.title}</span>
              <strong>{section.meta}</strong>
              <p>{section.description}</p>
            </button>
          ))}
        </div>
      </section>

      <StatusCards summary={summary} />

      {activeSection === "overview" ? (
        <div className="section-stack">
          <SpotlightIncident alert={latestCorrelatedIncident} onExport={handleExport} />
          <div className="dashboard-main">
            <div className="dashboard-column">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Top Protections</h2>
                    <p className="panel-subtext">The three core use cases that matter most for competition day.</p>
                  </div>
                  <span className="badge">3-signal MVP</span>
                </div>
                <div className="feature-list">
                  {protectionCards.map((card) => (
                    <div key={card.title} className="feature-row">
                      <div>
                        <div className="feature-name">{card.title}</div>
                        <div className="feature-meta">{card.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="dashboard-column">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Morocco-Relevant Threat Examples</h2>
                    <p className="panel-subtext">Use these examples explicitly in the competition pitch and live demo.</p>
                  </div>
                </div>
                <div className="feature-list">
                  {moroccoExamples.map((example) => (
                    <div key={example} className="feature-row">
                      <div className="feature-name">{example}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "incidents" ? (
        <div className="section-stack">
          <SpotlightIncident alert={latestCorrelatedIncident} onExport={handleExport} />
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Incident Filters</h2>
                <p className="panel-subtext">Narrow the queue by risk, family, type, label, or signal source.</p>
              </div>
              <span className="badge">Incident queue</span>
            </div>
            <form className="manual-form compact-form">
              <label>
                Risk
                <select value={filters.risk} onChange={(event) => setFilters((current) => ({ ...current, risk: event.target.value as typeof filters.risk }))}>
                  <option value="ALL">All</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </label>
              <label>
                Label
                <select value={filters.label} onChange={(event) => setFilters((current) => ({ ...current, label: event.target.value as typeof filters.label }))}>
                  <option value="ALL">All</option>
                  {labelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Dataset Family
                <select value={filters.datasetFamily} onChange={(event) => setFilters((current) => ({ ...current, datasetFamily: event.target.value as typeof filters.datasetFamily }))}>
                  <option value="ALL">All</option>
                  {familyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Event Type
                <select value={filters.eventType} onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value as typeof filters.eventType }))}>
                  <option value="ALL">All</option>
                  {eventTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source
                <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as typeof filters.source }))}>
                  <option value="ALL">All</option>
                  <option value="manual">manual</option>
                  <option value="simulation">simulation</option>
                  <option value="dataset">dataset</option>
                  <option value="external">external</option>
                </select>
              </label>
            </form>
          </section>
          <div className="dashboard-main">
            <div className="dashboard-column">
              <LiveFeed alerts={filteredAlerts} />
            </div>
            <div className="dashboard-column">
              <RecentAlertsTable alerts={filteredAlerts} />
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "signals" ? (
        <div className="section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Explainable Risk Scoring</h2>
                <p className="panel-subtext">Visible risk inputs show why an incident escalates after correlation instead of hiding the logic behind a black box.</p>
              </div>
              <span className="badge">Visible feature</span>
            </div>
            <div className="feature-list">
              {(latestCorrelatedIncident?.explainableRisk.factors ?? []).slice(0, 5).map((factor) => (
                <div key={factor.key} className="feature-row">
                  <div>
                    <div className="feature-name">{factor.label}</div>
                    <div className="feature-meta">{factor.detail}</div>
                  </div>
                  <strong>+{factor.weight}</strong>
                </div>
              ))}
            </div>
          </section>
          <ChartsPanel summary={summary} timeline={timeline} />
          <TopFeatures summary={summary} />
        </div>
      ) : null}

      {activeSection === "demo-lab" ? (
        <div className="dashboard-main">
          <div className="dashboard-column">
            <SimulationControls
              status={simulationStatus}
              onStart={() => void simulationService.start().then(setSimulationStatus)}
              onStop={() => void simulationService.stop().then(setSimulationStatus)}
              onOnce={() => void handleSimulationOnce()}
            />
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Demo Flow</h2>
                  <p className="panel-subtext">Recommended competition walkthrough in under 3 minutes.</p>
                </div>
              </div>
              <div className="feature-list">
                {[
                  "Trigger a fake Moroccan bank SMS or phishing email.",
                  "Show the sanitizer masking the lure and preserving only safe evidence.",
                  "Trigger a suspicious login from a new IP or device.",
                  "Show the correlation engine escalating severity and surfacing explainable score factors.",
                  "Export the incident report JSON with recommended actions."
                ].map((step) => (
                  <div key={step} className="feature-row">
                    <div className="feature-name">{step}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="dashboard-column">
            <ManualEventForm onSubmit={handleManualSubmit} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
