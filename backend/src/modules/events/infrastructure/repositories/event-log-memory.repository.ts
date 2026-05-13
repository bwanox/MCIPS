import type { EventLogRecord } from "../../../../shared/types/platform.js";
import type { EventLogRepository } from "../../domain/event-log.repository.js";

export class EventLogMemoryRepository implements EventLogRepository {
  private readonly eventLogs: EventLogRecord[] = [];

  async create(eventLog: EventLogRecord): Promise<EventLogRecord> {
    this.eventLogs.unshift(eventLog);
    return eventLog;
  }

  async list(): Promise<EventLogRecord[]> {
    return [...this.eventLogs];
  }
}
