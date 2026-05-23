import type { EventLogRecord } from "../../../shared/types/platform.js";

export interface EventDuplicateLookup {
  tenantId: string;
  sourceAdapter: string;
  sourceRef: string;
  eventHash: string;
  occurredAt: string;
  dedupeWindowMs: number;
}

export interface EventLogRepository {
  create(eventLog: EventLogRecord): Promise<EventLogRecord>;
  list(): Promise<EventLogRecord[]>;
  findDuplicate(criteria: EventDuplicateLookup): Promise<EventLogRecord | null>;
  listByIncidentId(incidentId: string): Promise<EventLogRecord[]>;
}
