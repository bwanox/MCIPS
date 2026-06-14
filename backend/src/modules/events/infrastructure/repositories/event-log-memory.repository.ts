import type { EventLogRecord, PaginatedResult } from "../../../../shared/types/platform.js";
import type { EventDuplicateLookup, EventLogRepository } from "../../domain/event-log.repository.js";

export class EventLogMemoryRepository implements EventLogRepository {
  private readonly eventLogs: EventLogRecord[] = [];

  async create(eventLog: EventLogRecord): Promise<EventLogRecord> {
    this.eventLogs.unshift(eventLog);
    return eventLog;
  }

  async list(tenantId?: string): Promise<EventLogRecord[]> {
    return this.eventLogs.filter((eventLog) => !tenantId || eventLog.tenantId === tenantId);
  }

  async paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<EventLogRecord>> {
    const filtered = await this.list(tenantId);
    const offset = (page - 1) * limit;
    return {
      items: filtered.slice(offset, offset + limit),
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit)
    };
  }

  async findDuplicate(criteria: EventDuplicateLookup): Promise<EventLogRecord | null> {
    const occurredAtMs = new Date(criteria.occurredAt).getTime();

    return (
      this.eventLogs.find((eventLog) => {
        if (eventLog.tenantId !== criteria.tenantId) {
          return false;
        }

        if (eventLog.sourceAdapter === criteria.sourceAdapter && eventLog.sourceRef === criteria.sourceRef) {
          return true;
        }

        return (
          eventLog.eventHash === criteria.eventHash &&
          Math.abs(new Date(eventLog.occurredAt).getTime() - occurredAtMs) <= criteria.dedupeWindowMs
        );
      }) ?? null
    );
  }

  async listByIncidentId(incidentId: string): Promise<EventLogRecord[]> {
    return this.eventLogs.filter((eventLog) => eventLog.incidentId === incidentId);
  }
}
