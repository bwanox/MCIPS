"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LiveFeed } from "../../components/dashboard/live-feed";
import { ManualEventForm } from "../../components/dashboard/manual-event-form";
import { ChartsPanel } from "../../components/dashboard/charts-panel";
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
import type { Alert } from "../../types/alert";
import type { DatasetFamily, RiskLevel, ThreatLabel } from "../../types/alert";
import type { SimulationStatus } from "../../types/simulation";
import type { StatsSummary, TimelinePoint } from "../../types/stats";
import type { CyberEventType, EventSource } from "../../types/event";

export default function DashboardPage() {
  type DashboardSection = "overview" | "monitoring" | "analytics" | "operations";

  const router = useRouter();
  const { loading, email } = useAuth(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>("Initializing");
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

  const refreshTimeline = useCallback(() => {
    void statsService.timeline("today").then((points) => {
      startTransition(() => setTimeline(points));
    });
  }, []);

  const handleSocketAlert = useCallback(
    (alert: Alert) => {
      startTransition(() => {
        setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]);
      });
      refreshTimeline();
    },
    [refreshTimeline]
  );

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

    void Promise.all([
      alertsService.recent().then(setAlerts),
      statsService.summary().then(setSummary),
      statsService.timeline("today").then(setTimeline),
      simulationService.status().then(setSimulationStatus)
    ]);
  }, [loading]);

  if (loading) {
    return <main className="dashboard-shell">Loading...</main>;
  }

  const handleManualSubmit = async (payload: EventSubmission) => {
    const alert = await eventsService.submit(payload);
    startTransition(() => {
      setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]);
    });
    refreshTimeline();
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filters.risk !== "ALL" && alert.risk !== filters.risk) {
      return false;
    }
    if (filters.label !== "ALL" && alert.label !== filters.label) {
      return false;
    }
    if (filters.datasetFamily !== "ALL" && alert.datasetFamily !== filters.datasetFamily) {
      return false;
    }
    if (filters.eventType !== "ALL" && alert.eventType !== filters.eventType) {
      return false;
    }
    if (filters.source !== "ALL" && alert.source !== filters.source) {
      return false;
    }

    return true;
  });

  const labelOptions = summary ? Object.keys(summary.labelDistribution) : [];
  const familyOptions = summary?.datasetFamilyDistribution.map((entry) => entry.family) ?? [];
  const eventTypeOptions = summary?.eventTypeDistribution.map((entry) => entry.eventType) ?? [];
  const sectionCards: Array<{
    id: DashboardSection;
    title: string;
    description: string;
    meta: string;
  }> = [
    {
      id: "overview",
      title: "Overview",
      description: "SOC snapshot, headline metrics, and the most recent alert activity.",
      meta: `${summary?.totalAlerts ?? 0} alerts tracked`
    },
    {
      id: "monitoring",
      title: "Monitoring",
      description: "Live feed, alert filters, and recent incident triage view.",
      meta: `${filteredAlerts.length} alerts in current filter`
    },
    {
      id: "analytics",
      title: "Analytics",
      description: "Distributions, timelines, and top feature signals.",
      meta: `${summary?.eventTypeDistribution.length ?? 0} event types`
    },
    {
      id: "operations",
      title: "Operations",
      description: "Simulation controls and manual event submission tools.",
      meta: `${simulationStatus?.running ? "Simulation active" : "Simulation idle"}`
    }
  ];

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <header className="panel hero-panel hero-primary">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">MCIPS detection command</p>
              <h1>Unified SOC visibility for live cyber events.</h1>
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
            Monitor SMS threats, authentication attempts, intrusion signals, phishing feature events, and logging anomalies
            through one normalized realtime pipeline with sanitized previews and analyst-friendly alert context.
          </p>
          <div className="hero-band">
            <div className="hero-chip">
              <span>Realtime state</span>
              <strong>{simulationStatus?.running ? "Streaming simulation active" : "Listening for new events"}</strong>
            </div>
            <div className="hero-chip">
              <span>Latest model posture</span>
              <strong>{summary ? `${summary.topFeatures.length} top signals tracked` : "Awaiting telemetry"}</strong>
            </div>
            <div className="hero-chip">
              <span>System message</span>
              <strong>{systemStatus.length > 80 ? `${systemStatus.slice(0, 80)}...` : systemStatus}</strong>
            </div>
          </div>
        </header>
        <aside className="panel hero-panel hero-secondary">
          <p className="eyebrow">Operations snapshot</p>
          <div className="hero-kpi-grid">
            <div className="hero-kpi">
              <span>Families</span>
              <strong>{summary?.datasetFamilyDistribution.length ?? 0}</strong>
            </div>
            <div className="hero-kpi">
              <span>Event types</span>
              <strong>{summary?.eventTypeDistribution.length ?? 0}</strong>
            </div>
            <div className="hero-kpi">
              <span>Phishing alerts</span>
              <strong>{summary?.phishingCount ?? 0}</strong>
            </div>
            <div className="hero-kpi">
              <span>Confidence avg</span>
              <strong>{summary ? `${Math.round(summary.averageConfidence * 100)}%` : "0%"}</strong>
            </div>
          </div>
        </aside>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Workspace Sections</h2>
            <p className="panel-subtext">Keep the home view focused, then move into the specific analyst workspace you need.</p>
          </div>
          <span className="badge">Focused navigation</span>
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
        <div className="dashboard-main">
          <div className="dashboard-column">
            <LiveFeed alerts={filteredAlerts} />
          </div>
          <div className="dashboard-column">
            <TopFeatures summary={summary} />
            <SimulationControls
              status={simulationStatus}
              onStart={() => void simulationService.start().then(setSimulationStatus)}
              onStop={() => void simulationService.stop().then(setSimulationStatus)}
              onOnce={() => void simulationService.once()}
            />
          </div>
        </div>
      ) : null}
      {activeSection === "monitoring" ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Analyst Filters</h2>
                <p className="panel-subtext">Narrow the live view by risk, family, type, label, or ingest source.</p>
              </div>
              <span className="badge">Live dashboard</span>
            </div>
            <form className="manual-form compact-form">
              <label>
                Risk
                <select
                  value={filters.risk}
                  onChange={(event) => setFilters((current) => ({ ...current, risk: event.target.value as typeof filters.risk }))}
                >
                  <option value="ALL">All</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </label>
              <label>
                Label
                <select
                  value={filters.label}
                  onChange={(event) => setFilters((current) => ({ ...current, label: event.target.value as typeof filters.label }))}
                >
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
                <select
                  value={filters.datasetFamily}
                  onChange={(event) => setFilters((current) => ({ ...current, datasetFamily: event.target.value as typeof filters.datasetFamily }))}
                >
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
                <select
                  value={filters.eventType}
                  onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value as typeof filters.eventType }))}
                >
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
                <select
                  value={filters.source}
                  onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as typeof filters.source }))}
                >
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
        </>
      ) : null}
      {activeSection === "analytics" ? (
        <div className="section-stack">
          <ChartsPanel summary={summary} timeline={timeline} />
          <TopFeatures summary={summary} />
        </div>
      ) : null}
      {activeSection === "operations" ? (
        <div className="dashboard-main">
          <div className="dashboard-column">
            <SimulationControls
              status={simulationStatus}
              onStart={() => void simulationService.start().then(setSimulationStatus)}
              onStop={() => void simulationService.stop().then(setSimulationStatus)}
              onOnce={() => void simulationService.once()}
            />
          </div>
          <div className="dashboard-column">
            <ManualEventForm onSubmit={handleManualSubmit} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
