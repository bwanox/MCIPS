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
import type { SimulationStatus } from "../../types/simulation";
import type { StatsSummary, TimelinePoint } from "../../types/stats";

export default function DashboardPage() {
  const router = useRouter();
  const { loading, email } = useAuth(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>("Initializing");

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
      <div className="dashboard-main">
        <div className="dashboard-column">
          <LiveFeed alerts={alerts} />
          <RecentAlertsTable alerts={alerts} />
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
