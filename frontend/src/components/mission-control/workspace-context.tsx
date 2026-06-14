"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "../../hooks/use-auth";
import { useDashboardSocket } from "../../hooks/use-dashboard-socket";
import { alertsService } from "../../services/alerts-service";
import { copilotService } from "../../services/copilot-service";
import { eventsService, type EventSubmission } from "../../services/events-service";
import { incidentsService } from "../../services/incidents-service";
import { simulationService } from "../../services/simulation-service";
import { statsService } from "../../services/stats-service";
import { systemService, type SystemHealth } from "../../services/system-service";
import type { Alert } from "../../types/alert";
import type { CopilotAnswer, CopilotFeedItem, Incident } from "../../types/incident";
import type { ScenarioRunResult, SimulationStatus } from "../../types/simulation";
import type { StatsSummary, TimelinePoint } from "../../types/stats";

const quickCopilotPrompts = [
  "Why was this flagged?",
  "What should we do first?",
  "Summarize this for management.",
  "Show related events."
] as const;

type TeamCard = {
  name: string;
  status: string;
  note: string;
};

type WorkspaceContextValue = {
  loading: boolean;
  email: string | null;
  alerts: Alert[];
  incidents: Incident[];
  summary: StatsSummary | null;
  timeline: TimelinePoint[];
  simulationStatus: SimulationStatus | null;
  systemHealth: SystemHealth | null;
  systemStatus: string;
  copilotFeed: CopilotFeedItem[];
  copilotAnswer: CopilotAnswer | null;
  copilotQuestion: string;
  selectedIncidentId: string;
  latestCorrelatedIncident: Alert | null;
  selectedIncident: Incident | null;
  selectedApprovalActionId: string | null;
  selectedNotifications: Incident["notifications"];
  aiFallbackActive: boolean;
  cyberTeamCards: TeamCard[];
  quickPrompts: readonly string[];
  setSelectedIncidentId: (id: string) => void;
  setCopilotQuestion: (value: string) => void;
  refreshData: () => void;
  runScenario: () => Promise<ScenarioRunResult>;
  runSimulationOnce: () => Promise<Alert>;
  startSimulationLoop: () => Promise<SimulationStatus>;
  stopSimulationLoop: () => Promise<SimulationStatus>;
  submitManualEvent: (payload: EventSubmission) => Promise<void>;
  queryCopilot: (question?: string) => Promise<void>;
  approveAction: (incidentId: string, actionId: string) => Promise<void>;
  rejectAction: (incidentId: string, actionId: string) => Promise<void>;
  exportAlert: (alert: Alert) => Promise<void>;
};

const DashboardWorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const downloadJson = (filename: string, payload: Record<string, unknown>): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const DashboardWorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { loading, email } = useAuth(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>("Waiting for live status");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [copilotFeed, setCopilotFeed] = useState<CopilotFeedItem[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [copilotQuestion, setCopilotQuestion] = useState("What should we do first?");
  const [copilotAnswer, setCopilotAnswer] = useState<CopilotAnswer | null>(null);

  const refreshData = useCallback(() => {
    void Promise.all([
      alertsService.recent().then(setAlerts),
      incidentsService.list().then((result) => {
        setIncidents(result.items);
        setSelectedIncidentId((current) => current || result.items[0]?.id || "");
      }),
      copilotService.feed().then((result) => setCopilotFeed(result.items)),
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

  const handleSocketIncident = useCallback((incident: Incident) => {
    startTransition(() => {
      setIncidents((current) => [incident, ...current.filter((item) => item.id !== incident.id)]);
      setSelectedIncidentId((current) => current || incident.id);
    });
  }, []);

  const handleSocketFeed = useCallback((item: CopilotFeedItem) => {
    startTransition(() => {
      setCopilotFeed((current) => [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, 20));
    });
  }, []);

  const handleSocketSimulation = useCallback((status: SimulationStatus) => {
    startTransition(() => setSimulationStatus(status));
  }, []);

  const handleSocketSystem = useCallback((status: unknown) => {
    startTransition(() => setSystemStatus(JSON.stringify(status)));
  }, []);

  useDashboardSocket({
    onAlert: handleSocketAlert,
    onIncident: handleSocketIncident,
    onFeed: handleSocketFeed,
    onStats: handleSocketStats,
    onSimulation: handleSocketSimulation,
    onSystem: handleSocketSystem
  });

  useEffect(() => {
    if (!loading) {
      refreshData();
    }
  }, [loading, refreshData]);

  const latestCorrelatedIncident =
    alerts.find((alert) => alert.correlationDetected) ??
    alerts.find((alert) => alert.severity === "critical") ??
    null;
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0] ?? null;
  const selectedApprovalActionId =
    selectedIncident?.actions.find((action) => action.requiresApproval && action.status === "pending")?.id ?? null;
  const selectedNotifications = selectedIncident?.notifications.slice(0, 5) ?? [];
  const aiFallbackActive =
    selectedIncident?.aiProvenance.summaryFallbackUsed ||
    selectedIncident?.aiProvenance.recommendedActionFallbackUsed ||
    selectedIncident?.aiProvenance.approvalClassificationFallbackUsed ||
    false;

  const cyberTeamCards = useMemo<TeamCard[]>(
    () =>
      selectedIncident
        ? [
            {
              name: "Triage Lead",
              status: selectedIncident.triagePriority,
              note: selectedIncident.summary
            },
            {
              name: "Threat Analyst",
              status: aiFallbackActive ? "Fallback reasoning" : "Model-backed reasoning",
              note: `Summary ${selectedIncident.aiProvenance.summaryModelUsed} · Actions ${selectedIncident.aiProvenance.recommendedActionModelUsed}`
            },
            {
              name: "Response Operator",
              status: selectedApprovalActionId ? "Awaiting approval" : "Response queued",
              note: selectedIncident.aiProvenance.approvalRequiredReason ?? "No additional approval reasoning recorded."
            }
          ]
        : [],
    [aiFallbackActive, selectedApprovalActionId, selectedIncident]
  );

  const submitManualEvent = useCallback(
    async (payload: EventSubmission) => {
      const alert = await eventsService.submit(payload);
      startTransition(() => {
        setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]);
      });
      refreshData();
    },
    [refreshData]
  );

  const runScenario = useCallback(async () => {
    const result = await simulationService.runPhishingLoginScenario();
    refreshData();
    return result;
  }, [refreshData]);

  const runSimulationOnce = useCallback(async () => {
    const result = await simulationService.once();
    refreshData();
    return result;
  }, [refreshData]);

  const startSimulationLoop = useCallback(async () => {
    const status = await simulationService.start();
    setSimulationStatus(status);
    return status;
  }, []);

  const stopSimulationLoop = useCallback(async () => {
    const status = await simulationService.stop();
    setSimulationStatus(status);
    return status;
  }, []);

  const queryCopilot = useCallback(
    async (question?: string) => {
      if (!selectedIncident) {
        return;
      }
      const nextQuestion = question ?? copilotQuestion;
      if (question) {
        setCopilotQuestion(question);
      }
      const response = await copilotService.query(selectedIncident.id, nextQuestion);
      setCopilotAnswer(response);
    },
    [copilotQuestion, selectedIncident]
  );

  const approveAction = useCallback(async (incidentId: string, actionId: string) => {
    const incident = await incidentsService.approveAction(incidentId, actionId);
    setIncidents((current) => [incident, ...current.filter((item) => item.id !== incident.id)]);
  }, []);

  const rejectAction = useCallback(async (incidentId: string, actionId: string) => {
    const incident = await incidentsService.rejectAction(incidentId, actionId);
    setIncidents((current) => [incident, ...current.filter((item) => item.id !== incident.id)]);
  }, []);

  const exportAlert = useCallback(async (alert: Alert) => {
    const payload = await alertsService.exportIncident(alert.id);
    downloadJson(`mcips-securelens-${alert.incidentId}.json`, payload);
  }, []);

  const value: WorkspaceContextValue = {
    loading,
    email,
    alerts,
    incidents,
    summary,
    timeline,
    simulationStatus,
    systemHealth,
    systemStatus,
    copilotFeed,
    copilotAnswer,
    copilotQuestion,
    selectedIncidentId,
    latestCorrelatedIncident,
    selectedIncident,
    selectedApprovalActionId,
    selectedNotifications,
    aiFallbackActive,
    cyberTeamCards,
    quickPrompts: quickCopilotPrompts,
    setSelectedIncidentId,
    setCopilotQuestion,
    refreshData,
    runScenario,
    runSimulationOnce,
    startSimulationLoop,
    stopSimulationLoop,
    submitManualEvent,
    queryCopilot,
    approveAction,
    rejectAction,
    exportAlert
  };

  return <DashboardWorkspaceContext.Provider value={value}>{children}</DashboardWorkspaceContext.Provider>;
};

export const useDashboardWorkspace = () => {
  const context = useContext(DashboardWorkspaceContext);
  if (!context) {
    throw new Error("useDashboardWorkspace must be used inside DashboardWorkspaceProvider");
  }
  return context;
};
