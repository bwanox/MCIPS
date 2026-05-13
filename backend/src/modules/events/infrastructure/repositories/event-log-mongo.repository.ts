import type { EventLogRecord } from "../../../../shared/types/platform.js";
import type { EventLogRepository } from "../../domain/event-log.repository.js";
import { EventLogModel } from "../models/event-log.model.js";

export class EventLogMongoRepository implements EventLogRepository {
  async create(eventLog: EventLogRecord): Promise<EventLogRecord> {
    await EventLogModel.create(eventLog);
    return eventLog;
  }

  async list(): Promise<EventLogRecord[]> {
    return (await EventLogModel.find().sort({ timestamp: -1 }).lean()) as unknown as EventLogRecord[];
  }
}
