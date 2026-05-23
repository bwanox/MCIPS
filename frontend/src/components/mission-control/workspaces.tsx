"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  FileJson,
  Inbox,
  MessageSquare,
  Play,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X
} from "lucide-react";
import Link from "next/link";

import { ManualEventForm } from "../dashboard/manual-event-form";
import { useDashboardWorkspace } from "./workspace-context";
import type { Alert } from "../../types/alert";
import type { Incident } from "../../types/incident";

const severityRank: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const sortBySeverity = <T extends { severity: string; lastSeenAt?: string; timestamp?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const rankDiff = (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.lastSeenAt ?? b.timestamp ?? 0).getTime() - new Date(a.lastSeenAt ?? a.timestamp ?? 0).getTime();
  });

const formatTime = (value?: string) => (value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--");

const truncateText = (value: string | undefined, maxLength: number) => {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
};

const getIncidentCode = (incident: Incident) => `CASE-${incident.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()}`;

const getIncidentHeadline = (incident: Incident) => {
  const sources = incident.sourceFamilies.map((source) => source.toUpperCase()).join("+");
  return `${sources || "SIGNAL"} / ${incident.triagePriority}`;
};

const getIncidentMeta = (incident: Incident) =>
  `${incident.status.replaceAll("_", " ")} · ${incident.sourceFamilies.join(" + ")} · ${formatTime(incident.lastSeenAt)}`;

const getAlertSignalLabel = (alert: Alert) => `${alert.sourceAdapter} · ${alert.eventType}`;

const StatusDot = ({ tone = "info" }: { tone?: "ok" | "warn" | "danger" | "info" }) => <span className={`status-dot status-dot-${tone}`} />;

const SeverityPill = ({ severity }: { severity: string }) => <span className={`severity-pill severity-pill-${severity}`}>{severity}</span>;

const EmptyPanel = ({ label }: { label: string }) => (
  <div className="empty-compact">
    <CircleDot size={16} />
    <span>{label}</span>
  </div>
);

const CaseQueue = ({ limit }: { limit?: number }) => {
  const { incidents, selectedIncident, setSelectedIncidentId } = useDashboardWorkspace();
  const items = sortBySeverity(incidents).slice(0, limit ?? incidents.length);

  return (
    <section className="os-panel case-queue">
      <div className="panel-titlebar">
        <span>
          <ShieldAlert size={16} />
          Case queue
        </span>
        <small>{items.length}</small>
      </div>
      <div className="case-list">
        {items.length ? (
          items.map((incident) => (
            <button
              key={incident.id}
              type="button"
              className={`case-row ${selectedIncident?.id === incident.id ? "case-row-active" : ""}`}
              onClick={() => setSelectedIncidentId(incident.id)}
            >
              <div>
                <strong>{getIncidentCode(incident)}</strong>
                <small>{getIncidentHeadline(incident)}</small>
              </div>
              <div className="row-meta">
                <SeverityPill severity={incident.severity} />
                <span>{getIncidentMeta(incident)}</span>
              </div>
            </button>
          ))
        ) : (
          <EmptyPanel label="No cases" />
        )}
      </div>
    </section>
  );
};

const SignalStream = ({ limit = 8 }: { limit?: number }) => {
  const { alerts, setSelectedIncidentId } = useDashboardWorkspace();
  const items = sortBySeverity(alerts).slice(0, limit);

  return (
    <section className="os-panel signal-stream">
      <div className="panel-titlebar">
        <span>
          <RadioTower size={16} />
          Signal stream
        </span>
        <small>live</small>
      </div>
      <div className="signal-list">
        {items.length ? (
          items.map((alert) => (
            <button key={alert.id} type="button" className="signal-row" onClick={() => setSelectedIncidentId(alert.incidentId)}>
              <div className="signal-glyph">
                <StatusDot tone={alert.severity === "critical" || alert.severity === "high" ? "danger" : "info"} />
              </div>
              <div>
                <strong>{getAlertSignalLabel(alert)}</strong>
                <small>
                  {alert.label} · {alert.risk} · {formatTime(alert.timestamp)}
                </small>
              </div>
              <SeverityPill severity={alert.severity} />
            </button>
          ))
        ) : (
          <EmptyPanel label="No live signals" />
        )}
      </div>
    </section>
  );
};

const CopilotConsole = ({ focused = false }: { focused?: boolean }) => {
  const {
    selectedIncident,
    copilotAnswer,
    copilotFeed,
    copilotQuestion,
    setCopilotQuestion,
    queryCopilot,
    quickPrompts,
    aiFallbackActive
  } = useDashboardWorkspace();

  return (
    <section className={`os-panel copilot-console ${focused ? "copilot-console-focused" : ""}`}>
      <div className="panel-titlebar">
        <span>
          <Bot size={16} />
          Copilot
        </span>
        <small>{aiFallbackActive ? "fallback" : "routed"}</small>
      </div>

      <div className="active-case-strip">
        <div className="active-case-main">
          <span>active case</span>
          <strong>{selectedIncident ? getIncidentCode(selectedIncident) : "No case"}</strong>
          {selectedIncident ? <small>{getIncidentMeta(selectedIncident)}</small> : null}
        </div>
        <SeverityPill severity={selectedIncident?.severity ?? "low"} />
      </div>

      <div className="console-feed">
        {copilotFeed.slice(0, focused ? 5 : 2).map((item) => (
          <article key={item.id} className="console-message console-message-system">
            <span>System · {formatTime(item.createdAt)}</span>
            <strong>{item.title}</strong>
            {focused ? <p>{item.summary}</p> : null}
          </article>
        ))}
        {copilotAnswer ? (
          <>
            <article className="console-message console-message-user">
              <span>Operator</span>
              <p>{copilotQuestion}</p>
            </article>
            <article className="console-message console-message-ai">
              <span>
                AI · {copilotAnswer.source} · {copilotAnswer.modelUsed}
              </span>
              <p>{copilotAnswer.answer}</p>
            </article>
          </>
        ) : (
          <article className="console-message console-message-ai">
            <span>AI ready</span>
            <p>{selectedIncident ? `${getIncidentCode(selectedIncident)} context loaded.` : "No case context."}</p>
          </article>
        )}
      </div>

      <div className="prompt-grid">
        {quickPrompts.map((prompt) => (
          <button key={prompt} className="prompt-chip" type="button" onClick={() => void queryCopilot(prompt)} disabled={!selectedIncident}>
            <Sparkles size={14} />
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="command-input"
        onSubmit={(event) => {
          event.preventDefault();
          void queryCopilot();
        }}
      >
        <Command size={18} />
        <input value={copilotQuestion} onChange={(event) => setCopilotQuestion(event.target.value)} />
        <button className="icon-action icon-action-primary" type="submit" disabled={!selectedIncident} title="Send prompt">
          <ArrowRight size={17} />
          <span>Send</span>
        </button>
      </form>
    </section>
  );
};

const ActionDock = ({ incident }: { incident?: Incident | null }) => {
  const { approveAction, rejectAction } = useDashboardWorkspace();
  const actions = incident?.actions ?? [];

  return (
    <section className="os-panel action-dock">
      <div className="panel-titlebar">
        <span>
          <ShieldCheck size={16} />
          Action dock
        </span>
        <small>{actions.filter((action) => action.status === "requested").length} pending</small>
      </div>
      <div className="action-list-os">
        {actions.length ? (
          actions.map((action) => (
            <div key={action.id} className="action-row-os">
              <div>
                <strong>{action.label}</strong>
                <small>
                  {action.status} · {action.requiresApproval ? "approval" : "notify"}
                  {action.executionMessage ? ` · ${truncateText(action.executionMessage, 52)}` : ""}
                </small>
              </div>
              {incident && action.status === "requested" && action.requiresApproval ? (
                <div className="icon-button-row">
                  <button className="square-action square-action-ok" type="button" title="Approve" onClick={() => void approveAction(incident.id, action.id)}>
                    <Check size={16} />
                  </button>
                  <button className="square-action square-action-danger" type="button" title="Reject" onClick={() => void rejectAction(incident.id, action.id)}>
                    <X size={16} />
                  </button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyPanel label="No actions" />
        )}
      </div>
    </section>
  );
};

const AgentRuntimePanel = () => {
  const { systemHealth } = useDashboardWorkspace();
  const agent = systemHealth?.agent;

  return (
    <section className="os-panel agent-panel">
      <div className="panel-titlebar">
        <span>
          <TerminalSquare size={16} />
          Agent runtime
        </span>
        <small>{agent?.online ? "online" : "standby"}</small>
      </div>
      {agent ? (
        <div className="runtime-grid">
          <div className="runtime-cell">
            <span>queue</span>
            <strong>{agent.queueDepth}</strong>
          </div>
          <div className="runtime-cell">
            <span>backend</span>
            <strong>{agent.backendReachable ? "reachable" : "degraded"}</strong>
          </div>
          <div className="runtime-cell runtime-cell-wide">
            <span>last action</span>
            <strong>{agent.lastActionExecutedAt ? new Date(agent.lastActionExecutedAt).toLocaleTimeString() : "none"}</strong>
          </div>
          {agent.collectors.map((collector) => (
            <div key={collector.name} className="collector-row">
              <StatusDot tone={collector.healthy ? "ok" : "danger"} />
              <span>{collector.name}</span>
              <small>{collector.lastEventAt ? formatTime(collector.lastEventAt) : "idle"}</small>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel label="Agent not reporting" />
      )}
    </section>
  );
};

const IncidentTimeline = ({ incident }: { incident: Incident | null }) => (
  <section className="os-panel timeline-panel">
    <div className="panel-titlebar">
      <span>
        <Clock3 size={16} />
        Timeline
      </span>
      <small>{incident?.timeline.length ?? 0} events</small>
    </div>
    <div className="timeline-list">
      {incident?.timeline.length ? (
        incident.timeline.map((entry) => (
          <article key={entry.id} className="timeline-item">
            <span>{formatTime(entry.occurredAt)}</span>
            <div>
              <strong>{entry.title}</strong>
              <small>
                {entry.sourceFamily} · {entry.sourceAdapter} · {entry.eventType}
              </small>
              <p>{entry.summary}</p>
            </div>
          </article>
        ))
      ) : (
        <EmptyPanel label="No timeline" />
      )}
    </div>
  </section>
);

const EvidencePanel = ({ alert, incident }: { alert: Alert | null; incident: Incident | null }) => (
  <section className="os-panel evidence-panel">
    <div className="panel-titlebar">
      <span>
        <FileJson size={16} />
        Evidence
      </span>
      <small>{alert?.explainableRisk.finalScore ?? 0}/100</small>
    </div>
    {alert || incident ? (
      <div className="evidence-stack">
        {alert ? (
          <>
            <div className="risk-meter">
              <span style={{ width: `${alert.explainableRisk.finalScore}%` }} />
            </div>
            <div className="evidence-block">
              <strong>{truncateText(alert.sanitizedPreview, 96)}</strong>
              <small>
                {alert.sourceAdapter} · {alert.modelUsed} · {alert.fallbackUsed ? "fallback" : "model"}
              </small>
            </div>
            {alert.explainableRisk.factors.slice(0, 5).map((factor) => (
              <div key={factor.key} className="factor-row">
                <span>{factor.label}</span>
                <strong>+{factor.weight}</strong>
              </div>
            ))}
          </>
        ) : null}
      </div>
    ) : (
      <EmptyPanel label="No evidence" />
    )}
  </section>
);

const NotificationRail = ({ incident }: { incident: Incident | null }) => (
  <section className="os-panel">
    <div className="panel-titlebar">
      <span>
        <MessageSquare size={16} />
        Handoffs
      </span>
      <small>{incident?.notifications.length ?? 0}</small>
    </div>
    <div className="action-list-os">
      {incident?.notifications.length ? (
        incident.notifications.slice(0, 5).map((notification) => (
          <div key={notification.id} className="action-row-os">
            <div>
              <strong>{notification.subject}</strong>
              <small>
                {notification.recipient} · {notification.delivered ? "delivered" : "failed"}
              </small>
            </div>
            <StatusDot tone={notification.delivered ? "ok" : "warn"} />
          </div>
        ))
      ) : (
        <EmptyPanel label="No handoffs" />
      )}
    </div>
  </section>
);

const ThreatInboxRows = () => {
  const { alerts, setSelectedIncidentId } = useDashboardWorkspace();
  const inboxAlerts = alerts
    .filter((alert) => alert.sourceFamily === "messaging" || alert.sourceFamily === "email")
    .slice(0, 14);

  return (
    <section className="os-panel inbox-panel">
      <div className="panel-titlebar">
        <span>
          <Inbox size={16} />
          Threat inbox
        </span>
        <small>{inboxAlerts.length}</small>
      </div>
      <div className="inbox-list">
        {inboxAlerts.length ? (
          inboxAlerts.map((alert) => (
            <Link
              key={alert.id}
              href="/dashboard/incidents"
              className="inbox-row"
              onClick={() => setSelectedIncidentId(alert.incidentId)}
            >
              <div className="inbox-source">
                <MessageSquare size={16} />
              </div>
              <div>
                <strong>{alert.title}</strong>
                <small>
                  {alert.sourceAdapter} · {alert.detectedBank ?? alert.sourceFamily} · {formatTime(alert.timestamp)}
                </small>
                <p>{truncateText(alert.sanitizedPreview, 140)}</p>
              </div>
              <SeverityPill severity={alert.severity} />
            </Link>
          ))
        ) : (
          <EmptyPanel label="No suspicious messages" />
        )}
      </div>
    </section>
  );
};

export const MissionOverviewView = () => {
  const { selectedIncident, latestCorrelatedIncident } = useDashboardWorkspace();

  return (
    <div className="command-grid">
      <div className="command-left">
        <CaseQueue limit={6} />
        <SignalStream limit={7} />
      </div>
      <CopilotConsole />
      <div className="command-right">
        <EvidencePanel alert={latestCorrelatedIncident} incident={selectedIncident} />
        <ActionDock incident={selectedIncident} />
        <AgentRuntimePanel />
      </div>
    </div>
  );
};

export const CopilotDeskView = () => {
  const { selectedIncident, setSelectedIncidentId, incidents } = useDashboardWorkspace();

  return (
    <div className="ai-desk-grid">
      <CopilotConsole focused />
      <aside className="desk-rail">
        <section className="os-panel">
          <div className="panel-titlebar">
            <span>
              <ShieldAlert size={16} />
              Active case
            </span>
          </div>
          <select className="os-select" value={selectedIncident?.id ?? ""} onChange={(event) => setSelectedIncidentId(event.target.value)}>
            {incidents.map((incident) => (
              <option key={incident.id} value={incident.id}>
                {incident.severity} · {incident.status} · {incident.id}
              </option>
            ))}
          </select>
        </section>
        <EvidencePanel alert={null} incident={selectedIncident} />
        <ActionDock incident={selectedIncident} />
      </aside>
    </div>
  );
};

export const IncidentWorkspaceView = () => {
  const { selectedIncident, latestCorrelatedIncident } = useDashboardWorkspace();

  return (
    <div className="case-board-grid">
      <CaseQueue />
      <div className="case-center">
        <section className="os-panel case-header-panel">
          <div className="case-header-line">
            <div>
              <span>selected case</span>
              <strong>{selectedIncident ? getIncidentCode(selectedIncident) : "No case"}</strong>
              {selectedIncident ? <small>{getIncidentMeta(selectedIncident)}</small> : null}
            </div>
            <SeverityPill severity={selectedIncident?.severity ?? "low"} />
          </div>
        </section>
        <IncidentTimeline incident={selectedIncident} />
      </div>
      <aside className="case-rail">
        <EvidencePanel alert={latestCorrelatedIncident} incident={selectedIncident} />
        <ActionDock incident={selectedIncident} />
        <NotificationRail incident={selectedIncident} />
      </aside>
    </div>
  );
};

export const InboxWorkspaceView = () => (
  <div className="inbox-grid">
    <ThreatInboxRows />
    <SignalStream limit={10} />
  </div>
);

export const OperationsWorkspaceView = () => {
  const { incidents, selectedIncident, setSelectedIncidentId } = useDashboardWorkspace();
  const pending = incidents.filter((incident) => incident.actions.some((action) => action.status === "requested"));
  const completed = incidents.flatMap((incident) =>
    incident.actions
      .filter((action) => action.status !== "requested")
      .map((action) => ({ incidentId: incident.id, action }))
  );

  return (
    <div className="ops-grid">
      <section className="os-panel">
        <div className="panel-titlebar">
          <span>
            <AlertTriangle size={16} />
            Pending approvals
          </span>
          <small>{pending.length}</small>
        </div>
        <div className="case-list">
          {pending.length ? (
            pending.map((incident) => (
              <button key={incident.id} type="button" className="case-row" onClick={() => setSelectedIncidentId(incident.id)}>
                <div>
                  <strong>{getIncidentCode(incident)}</strong>
                  <small>{incident.actions.filter((action) => action.status === "requested").length} requested</small>
                </div>
                <SeverityPill severity={incident.severity} />
              </button>
            ))
          ) : (
            <EmptyPanel label="No pending approvals" />
          )}
        </div>
      </section>
      <div className="ops-center">
        <ActionDock incident={selectedIncident} />
        <section className="os-panel">
          <div className="panel-titlebar">
            <span>
              <Check size={16} />
              Completed actions
            </span>
            <small>{completed.length}</small>
          </div>
          <div className="action-list-os">
            {completed.slice(0, 8).map((entry) => (
              <div key={`${entry.incidentId}-${entry.action.id}`} className="action-row-os">
                <div>
                  <strong>{entry.action.label}</strong>
                  <small>
                    {entry.action.status} · CASE-{entry.incidentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <AgentRuntimePanel />
    </div>
  );
};

export const DemoLabView = () => {
  const { simulationStatus, runScenario, startSimulationLoop, stopSimulationLoop, runSimulationOnce, submitManualEvent } =
    useDashboardWorkspace();

  return (
    <div className="demo-grid">
      <section className="os-panel scenario-panel">
        <div className="panel-titlebar">
          <span>
            <Play size={16} />
            Phishing-login scenario
          </span>
          <small>{simulationStatus?.running ? "running" : "idle"}</small>
        </div>
        <div className="scenario-console">
          <div>
            <span>scenario</span>
            <strong>{simulationStatus?.scenario ?? "phishing-login"}</strong>
          </div>
          <div>
            <span>last run</span>
            <strong>{simulationStatus?.lastRunAt ? new Date(simulationStatus.lastRunAt).toLocaleString() : "not run"}</strong>
          </div>
          <div>
            <span>last alert</span>
            <strong>{simulationStatus?.lastAlertAt ? new Date(simulationStatus.lastAlertAt).toLocaleString() : "none"}</strong>
          </div>
        </div>
        <div className="scenario-actions">
          <button className="icon-action icon-action-primary" type="button" onClick={() => void runScenario()}>
            <Play size={17} />
            Run scenario
          </button>
          <button className="icon-action" type="button" onClick={() => void startSimulationLoop()}>
            <RadioTower size={17} />
            Start loop
          </button>
          <button className="icon-action" type="button" onClick={() => void stopSimulationLoop()}>
            <X size={17} />
            Stop
          </button>
          <button className="icon-action" type="button" onClick={() => void runSimulationOnce()}>
            <Command size={17} />
            Once
          </button>
        </div>
      </section>
      <section className="developer-tool-shell">
        <ManualEventForm onSubmit={submitManualEvent} />
      </section>
      <AgentRuntimePanel />
    </div>
  );
};
