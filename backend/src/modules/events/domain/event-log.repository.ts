import type { EventLogRecord } from "../../../shared/types/platform.js";

export interface EventLogRepository {
  create(eventLog: EventLogRecord): Promise<EventLogRecord>;
  list(): Promise<EventLogRecord[]>;
}
