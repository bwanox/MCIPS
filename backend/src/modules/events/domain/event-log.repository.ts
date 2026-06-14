import type { EventLogRecord, PaginatedResult } from "../../../shared/types/platform.js";

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
  list(tenantId?: string): Promise<EventLogRecord[]>;
  paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<EventLogRecord>>;
  findDuplicate(criteria: EventDuplicateLookup): Promise<EventLogRecord | null>;
  listByIncidentId(incidentId: string): Promise<EventLogRecord[]>;
}
