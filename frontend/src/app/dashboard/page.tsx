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
  const router = useRouter();
  const { loading, email } = useAuth(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>("Initializing");
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

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">MCIPS realtime detection layer</p>
          <h1>Authenticated SOC Dashboard</h1>
          <p>{systemStatus}</p>
        </div>
        <div className="header-actions">
          <span className="badge badge-live">{email}</span>
          <button
            onClick={async () => {
              await authService.logout();
              window.localStorage.removeItem("mcips_token");
              router.replace("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <StatusCards summary={summary} />
      <section className="panel">
        <div className="panel-header">
          <h2>Filters</h2>
          <span className="badge">Live dashboard</span>
        </div>
        <form className="manual-form">
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
            <input value={filters.label} onChange={(event) => setFilters((current) => ({ ...current, label: event.target.value as typeof filters.label }))} placeholder="ALL or label" />
          </label>
          <label>
            Dataset Family
            <input
              value={filters.datasetFamily}
              onChange={(event) => setFilters((current) => ({ ...current, datasetFamily: event.target.value as typeof filters.datasetFamily }))}
              placeholder="ALL or family"
            />
          </label>
          <label>
            Event Type
            <input
              value={filters.eventType}
              onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value as typeof filters.eventType }))}
              placeholder="ALL or event type"
            />
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
          <RecentAlertsTable alerts={filteredAlerts} />
        </div>
        <div className="dashboard-column">
          <SimulationControls
            status={simulationStatus}
            onStart={() => void simulationService.start().then(setSimulationStatus)}
            onStop={() => void simulationService.stop().then(setSimulationStatus)}
            onOnce={() => void simulationService.once()}
          />
          <ManualEventForm onSubmit={handleManualSubmit} />
          <TopFeatures summary={summary} />
        </div>
      </div>
      <ChartsPanel summary={summary} timeline={timeline} />
    </main>
  );
}
