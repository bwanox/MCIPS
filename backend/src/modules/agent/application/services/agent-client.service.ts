import { env } from "../../../../shared/config/env.js";

export interface AgentActionContext {
  summary: string;
  sourceFamilies: string[];
  recommendedActions: string[];
  tenantId: string;
}

export interface AgentActionCommand {
  actionId: string;
  incidentId: string;
  actionKey: string;
  label: string;
  context?: AgentActionContext;
}

export interface AgentActionResult {
  accepted: boolean;
  message: string;
  provider: string;
  artifactPaths?: string[];
}

export interface AgentCollectorStatus {
  name: string;
  path: string;
  healthy: boolean;
  lastEventAt?: string;
  error?: string;
}

export interface AgentStatusResult {
  online: boolean;
  service: string;
  backendReachable: boolean;
  queueDepth: number;
  lastEventForwardedAt?: string;
  lastActionExecutedAt?: string;
  lastActionArtifactPaths?: string[];
  collectors: AgentCollectorStatus[];
  message: string;
}

export class AgentClientService {
  async executeAction(command: AgentActionCommand): Promise<AgentActionResult> {
    try {
      const response = await fetch(`${env.agentApiUrl.replace(/\/+$/, "")}/agent/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.agentApiToken}`
        },
        body: JSON.stringify(command)
      });

      if (!response.ok) {
        throw new Error(`Agent returned ${response.status}`);
      }

      const payload = (await response.json()) as Partial<AgentActionResult>;
      return {
        accepted: payload.accepted ?? true,
        message: payload.message ?? "Action accepted by agent",
        provider: payload.provider ?? "go_agent",
        artifactPaths: payload.artifactPaths ?? []
      };
    } catch (error) {
      return {
        accepted: true,
        message: `Agent unavailable; action recorded in simulation mode. ${error instanceof Error ? error.message : ""}`.trim(),
        provider: "simulation",
        artifactPaths: []
      };
    }
  }

  async getStatus(): Promise<AgentStatusResult> {
    try {
      const response = await fetch(`${env.agentApiUrl.replace(/\/+$/, "")}/agent/status`, {
        headers: {
          Authorization: `Bearer ${env.agentApiToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Agent returned ${response.status}`);
      }

      const payload = (await response.json()) as Partial<AgentStatusResult>;
      return {
        online: payload.online ?? true,
        service: payload.service ?? "mcips-go-agent",
        backendReachable: payload.backendReachable ?? false,
        queueDepth: payload.queueDepth ?? 0,
        lastEventForwardedAt: payload.lastEventForwardedAt,
        lastActionExecutedAt: payload.lastActionExecutedAt,
        lastActionArtifactPaths: payload.lastActionArtifactPaths ?? [],
        collectors: payload.collectors ?? [],
        message: payload.message ?? "agent online"
      };
    } catch (error) {
      return {
        online: false,
        service: "mcips-go-agent",
        backendReachable: false,
        queueDepth: 0,
        lastActionArtifactPaths: [],
        collectors: [],
        message: `Agent unavailable. ${error instanceof Error ? error.message : ""}`.trim()
      };
    }
  }
}
