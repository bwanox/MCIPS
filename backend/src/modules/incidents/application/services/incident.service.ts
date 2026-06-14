import { randomUUID } from "node:crypto";

import type { IncidentRepository } from "../../domain/incident.repository.js";
import type {
  AlertRecord,
  AiGeneratedTextResult,
  IncidentAiProvenance,
  AuditTrailEntry,
  CopilotFeedItem,
  CorrelatedSignal,
  IncidentActionRecord,
  IncidentRecord,
  IncidentStatus,
  IncidentTimelineEntry,
  IncidentReasoningResult,
  EventLogRecord,
  PaginatedResult,
  TriagePriority
} from "../../../../shared/types/platform.js";
import type { EmailNotificationService } from "../../../notifications/application/services/email-notification.service.js";
import type { AgentClientService } from "../../../agent/application/services/agent-client.service.js";
import type { AiInferenceService } from "../../../events/application/services/ai-inference.service.js";
import type { AppSocketServer } from "../../../../shared/config/socket.js";
import { buildIncidentGraph } from "../../../../services/incidentGraph.service.js";

const toTriagePriority = (severity: AlertRecord["severity"]): TriagePriority => {
  switch (severity) {
    case "critical":
      return "CRITICAL";
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    default:
      return "LOW";
  }
};

const buildActionKey = (action: string): string => {
  const normalized = action.toLowerCase();
  if (normalized.includes("password reset")) return "force_password_reset";
  if (normalized.includes("block")) return "block_indicator";
  if (normalized.includes("review")) return "create_review_task";
  if (normalized.includes("inspect")) return "inspect_host";
  if (normalized.includes("notify")) return "notify_target";
  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
};

const requiresApproval = (actionKey: string): boolean => actionKey === "force_password_reset";

const toProvenanceSource = (
  modelUsed: string,
  fallbackUsed: boolean
): IncidentAiProvenance["summarySource"] => {
  if (fallbackUsed) {
    return "deterministic_fallback";
  }
  if (modelUsed.toLowerCase().includes("qwen") || modelUsed.toLowerCase().includes("openrouter")) {
    return "cloud_model";
  }
  if (modelUsed === "backend_fallback") {
    return "backend";
  }
  return "local_model";
};

const defaultAiProvenance = (): IncidentAiProvenance => ({
  summarySource: "backend",
  summaryModelUsed: "backend_fallback",
  summaryFallbackUsed: true,
  recommendedActionSource: "backend",
  recommendedActionModelUsed: "backend_fallback",
  recommendedActionFallbackUsed: true,
  approvalClassificationSource: "backend",
  approvalClassificationModelUsed: "backend_fallback",
  approvalClassificationFallbackUsed: true
});

const buildAuditEntry = (kind: AuditTrailEntry["kind"], message: string): AuditTrailEntry => ({
  id: randomUUID(),
  kind,
  message,
  createdAt: new Date().toISOString()
});

export class IncidentService {
  constructor(
    private readonly repository: IncidentRepository,
    private readonly aiInferenceService: AiInferenceService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly agentClientService: AgentClientService,
    private readonly io?: AppSocketServer
  ) {}

  private buildTimelineEntry(alert: AlertRecord, position: number): IncidentTimelineEntry {
    return {
      id: randomUUID(),
      alertId: alert.id,
      eventId: alert.eventId,
      eventType: alert.eventType,
      title: alert.title,
      summary: alert.incidentSummary,
      sourceFamily: alert.sourceFamily,
      sourceAdapter: alert.sourceAdapter,
      occurredAt: alert.occurredAt,
      severity: alert.severity,
      mitreTags: alert.mitre?.map(m => m.techniqueId) ?? [],
      riskChange: alert.explainableRisk.escalated
        ? `+${alert.explainableRisk.correlationBonus} (Correlation Escalation)`
        : `+${alert.explainableRisk.finalScore} (Initial Discovery)`,
      recommendedAction: alert.recommendedActions[0] ?? "Analyze compromised session activity details.",
      evidenceType: alert.eventType,
      citationId: `T${position}`
    };
  }

  private buildActionRecords(
    incidentId: string,
    actions: string[],
    existingActions: IncidentActionRecord[],
    approval: { approvalRequired: boolean; approvalReason?: string }
  ): IncidentActionRecord[] {
    const byKey = new Map(existingActions.map((action) => [action.actionKey, action]));

    for (const [index, label] of actions.entries()) {
      const actionKey = buildActionKey(label);
      if (!byKey.has(actionKey)) {
        const createdAt = new Date().toISOString();
        const aiRequiresApproval = approval.approvalRequired && index === 0;
        byKey.set(actionKey, {
          id: randomUUID(),
          incidentId,
          label,
          actionKey,
          status: "pending",
          requiresApproval: requiresApproval(actionKey) || aiRequiresApproval,
          executionMode: requiresApproval(actionKey) || aiRequiresApproval ? "approval" : "notify",
          createdAt,
          updatedAt: createdAt
        });
      }
    }

    return [...byKey.values()];
  }

  private shouldSendNotification(incident: IncidentRecord, kind: IncidentRecord["notifications"][number]["kind"]): boolean {
    return !incident.notifications.some((notification) => notification.kind === kind);
  }

  async syncFromAlert(alert: AlertRecord, eventLog: EventLogRecord): Promise<IncidentRecord> {
    const existing = await this.repository.findById(alert.incidentId);
    const fallbackRecommendedActions = [...new Set(alert.recommendedActions)];
    const reasoning =
      (await this.aiInferenceService.reasonIncident({
        incidentId: alert.incidentId,
        tenantId: alert.tenantId,
        title: alert.title,
        summary: alert.incidentSummary,
        recommendedActions: fallbackRecommendedActions,
        signals: [
          {
            eventId: alert.eventId,
            eventType: alert.eventType,
            title: alert.title,
            label: alert.label,
            risk: alert.risk
          },
          ...alert.correlatedSignals.map((signal: CorrelatedSignal) => ({
            eventId: signal.eventId,
            eventType: signal.eventType,
            title: signal.title,
            label: signal.label,
            risk: signal.risk
          }))
        ]
      })) ??
      ({
        summary: alert.incidentSummary,
        recommendedActions: fallbackRecommendedActions,
        approvalRequired: fallbackRecommendedActions.some((action) => buildActionKey(action) === "force_password_reset"),
        approvalReason: "Password reset and access-change actions require operator approval.",
        modelUsed: "backend_fallback",
        fallbackUsed: true
      } satisfies IncidentReasoningResult);

    const recommendedActions = [...new Set(reasoning.recommendedActions)];
    const nextActions = this.buildActionRecords(alert.incidentId, recommendedActions, existing?.actions ?? [], {
      approvalRequired: reasoning.approvalRequired,
      approvalReason: reasoning.approvalReason
    });
    const pendingApproval = nextActions.some((action) => action.requiresApproval && action.status === "pending");
    const nextStatus: IncidentStatus = pendingApproval ? "awaiting_approval" : existing?.status ?? "new";
    const reasoningSource = toProvenanceSource(reasoning.modelUsed, reasoning.fallbackUsed);
    const priorProvenance = existing?.aiProvenance ?? defaultAiProvenance();
    const evidenceCitation = `E${(existing?.evidence.length ?? 0) + 1}`;
    const nextMitre = (alert.mitre ?? []).map((mapping) => ({
      ...mapping,
      evidenceIds: [evidenceCitation]
    }));

    const incident: IncidentRecord = {
      id: alert.incidentId,
      tenantId: alert.tenantId,
      status: nextStatus,
      severity: alert.severity,
      triagePriority: toTriagePriority(alert.severity),
      sourceFamilies: [...new Set([...(existing?.sourceFamilies ?? []), alert.sourceFamily])],
      firstSeenAt: existing?.firstSeenAt ?? alert.occurredAt,
      lastSeenAt: alert.occurredAt,
      summary: reasoning.summary,
      recommendedActions,
      correlatedSignals: [
        ...new Map(
          [...(existing?.correlatedSignals ?? []), ...alert.correlatedSignals].map((signal) => [signal.alertId, signal])
        ).values()
      ],
      timeline: [
        ...(existing?.timeline ?? []),
        this.buildTimelineEntry(alert, (existing?.timeline.length ?? 0) + 1)
      ].sort((left, right) =>
        left.occurredAt.localeCompare(right.occurredAt)
      ),
      evidence: [
        ...(existing?.evidence ?? []),
        {
          id: randomUUID(),
          citationId: evidenceCitation,
          alertId: alert.id,
          eventId: alert.eventId,
          title: alert.title,
          summary: alert.incidentSummary,
          occurredAt: alert.occurredAt,
          sourceFamily: alert.sourceFamily
        }
      ],
      auditTrail: [
        ...(existing?.auditTrail ?? []),
        buildAuditEntry("event_ingested", `Linked event ${alert.eventId} from ${alert.sourceAdapter}`)
      ],
      actions: nextActions,
      notifications: existing?.notifications ?? [],
      aiProvenance: {
        ...priorProvenance,
        summarySource: reasoningSource,
        summaryModelUsed: reasoning.modelUsed,
        summaryFallbackUsed: reasoning.fallbackUsed,
        recommendedActionSource: reasoningSource,
        recommendedActionModelUsed: reasoning.modelUsed,
        recommendedActionFallbackUsed: reasoning.fallbackUsed,
        approvalClassificationSource: reasoningSource,
        approvalClassificationModelUsed: reasoning.modelUsed,
        approvalClassificationFallbackUsed: reasoning.fallbackUsed,
        approvalRequiredReason: reasoning.approvalReason
      },
      latestAlertId: alert.id,
      latestEventId: eventLog.eventId,
      mitre: [
        ...new Map(
          [...(existing?.mitre ?? []), ...nextMitre].map((mapping) => [
            `${mapping.techniqueId}:${mapping.evidenceIds.join(",")}`,
            mapping
          ])
        ).values()
      ],
      threatIntel: alert.threatIntel ?? [],
      graph: buildIncidentGraph(alert, alert.correlatedSignals)
    };

    const saved = existing ? await this.repository.update(incident) : await this.repository.create(incident);
    const notifications = [...saved.notifications];

    if (saved.severity === "critical" && this.shouldSendNotification(saved, "critical_incident")) {
      const notification = await this.emailNotificationService.sendIncidentNotification(saved, "critical_incident");
      notifications.push(notification);
      saved.auditTrail.push(buildAuditEntry("notification_sent", `Critical incident email queued for ${notification.recipient}`));
    }

    if (saved.status === "awaiting_approval" && this.shouldSendNotification(saved, "approval_required")) {
      const actionLabel = saved.actions.find((action) => action.status === "pending" && action.requiresApproval)?.label;
      const notification = await this.emailNotificationService.sendIncidentNotification(saved, "approval_required", actionLabel);
      notifications.push(notification);
      saved.auditTrail.push(buildAuditEntry("notification_sent", `Approval required email queued for ${notification.recipient}`));
    }

    saved.notifications = notifications;
    const updated = await this.repository.update(saved);
    this.io?.to(`tenant:${updated.tenantId}`).emit("incident:update", updated);
    this.io?.to(`tenant:${updated.tenantId}`).emit("copilot:feed", this.toFeedItem(updated));
    if (updated.actions.some((action) => action.status === "pending" && action.requiresApproval)) {
      this.io
        ?.to(`tenant:${updated.tenantId}`)
        .emit("action:pending", updated.actions.filter((action) => action.status === "pending"));
    }
    return updated;
  }

  async list(tenantId?: string): Promise<IncidentRecord[]> {
    return this.repository.list(tenantId);
  }

  async paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<IncidentRecord>> {
    return this.repository.paginate(tenantId, page, limit);
  }

  async findById(id: string): Promise<IncidentRecord | null> {
    return this.repository.findById(id);
  }

  async recordCopilotMetadata(incidentId: string, answer: AiGeneratedTextResult | null): Promise<void> {
    const incident = await this.repository.findById(incidentId);
    if (!incident || !answer) {
      return;
    }

    incident.aiProvenance = {
      ...incident.aiProvenance,
      lastCopilotAnswerSource: toProvenanceSource(answer.modelUsed, answer.fallbackUsed),
      lastCopilotAnswerModelUsed: answer.modelUsed,
      lastCopilotAnswerFallbackUsed: answer.fallbackUsed
    };
    await this.repository.update(incident);
  }

  async updateStatus(id: string, status: IncidentStatus): Promise<IncidentRecord | null> {
    const incident = await this.repository.findById(id);
    if (!incident) {
      return null;
    }

    incident.status = status;
    incident.auditTrail.push(buildAuditEntry("status_updated", `Incident status changed to ${status}`));
    return this.repository.update(incident);
  }

  async approveAction(incidentId: string, actionId: string): Promise<IncidentRecord | null> {
    const incident = await this.repository.findById(incidentId);
    if (!incident) {
      return null;
    }

    const action = incident.actions.find((entry) => entry.id === actionId);
    if (!action) {
      return incident;
    }

    const now = new Date().toISOString();
    action.status = "approved";
    action.approvedAt = now;
    action.updatedAt = now;
    incident.auditTrail.push(buildAuditEntry("action_approved", `Approved action ${action.label}`));

    action.status = "dispatching";
    action.updatedAt = new Date().toISOString();
    const dispatching = await this.repository.update(incident);
    this.io?.to(`tenant:${incident.tenantId}`).emit("action:status", action);
    this.io?.to(`tenant:${incident.tenantId}`).emit("incident:update", dispatching);

    const result = await this.agentClientService.executeAction({
      actionId: action.id,
      incidentId,
      actionKey: action.actionKey,
      label: action.label,
      context: {
        summary: incident.summary,
        sourceFamilies: incident.sourceFamilies,
        recommendedActions: incident.recommendedActions,
        tenantId: incident.tenantId
      }
    });

    action.status = result.outcome;
    action.updatedAt = new Date().toISOString();
    action.executionMessage = result.artifactPaths?.length
      ? `${result.message} (${result.artifactPaths.join(", ")})`
      : result.message;
    action.executionReceipt = {
      idempotencyId: action.id,
      provider: result.provider,
      outcome: result.outcome,
      executedAt: action.updatedAt,
      message: result.message,
      artifactPaths: result.artifactPaths ?? []
    };
    incident.auditTrail.push(
      buildAuditEntry(
        "status_updated",
        result.artifactPaths?.length ? `${result.message} (${result.artifactPaths.join(", ")})` : result.message
      )
    );
    incident.status = incident.actions.some((entry) => entry.requiresApproval && entry.status === "pending")
      ? "awaiting_approval"
      : "investigating";

    const saved = await this.repository.update(incident);
    this.io?.to(`tenant:${incident.tenantId}`).emit("action:status", action);
    this.io?.to(`tenant:${incident.tenantId}`).emit("incident:update", saved);
    return saved;
  }

  async rejectAction(incidentId: string, actionId: string): Promise<IncidentRecord | null> {
    const incident = await this.repository.findById(incidentId);
    if (!incident) {
      return null;
    }

    const action = incident.actions.find((entry) => entry.id === actionId);
    if (!action) {
      return incident;
    }

    const now = new Date().toISOString();
    action.status = "rejected";
    action.rejectedAt = now;
    action.updatedAt = now;
    incident.auditTrail.push(buildAuditEntry("action_rejected", `Rejected action ${action.label}`));
    incident.status = incident.actions.some((entry) => entry.requiresApproval && entry.status === "pending")
      ? "awaiting_approval"
      : "investigating";

    const saved = await this.repository.update(incident);
    this.io?.to(`tenant:${incident.tenantId}`).emit("action:status", action);
    this.io?.to(`tenant:${incident.tenantId}`).emit("incident:update", saved);
    return saved;
  }

  async listFeed(
    tenantId: string,
    page: number,
    limit: number
  ): Promise<PaginatedResult<CopilotFeedItem>> {
    const result = await this.repository.paginate(tenantId, page, limit);
    return {
      ...result,
      items: result.items.map((incident) => this.toFeedItem(incident))
    };
  }

  toFeedItem(incident: IncidentRecord): CopilotFeedItem {
    return {
      id: `${incident.id}:${incident.lastSeenAt}`,
      incidentId: incident.id,
      title: incident.summary.split(".")[0] ?? incident.summary,
      summary: incident.summary,
      severity: incident.severity,
      sourceFamilies: incident.sourceFamilies,
      createdAt: incident.lastSeenAt
    };
  }
}
