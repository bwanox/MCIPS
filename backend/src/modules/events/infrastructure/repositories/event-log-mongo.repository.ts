import type { EventLogRecord, PaginatedResult } from "../../../../shared/types/platform.js";
import type { EventDuplicateLookup, EventLogRepository } from "../../domain/event-log.repository.js";
import { EventLogModel } from "../models/event-log.model.js";

export class EventLogMongoRepository implements EventLogRepository {
  async create(eventLog: EventLogRecord): Promise<EventLogRecord> {
    await EventLogModel.create(eventLog);
    return eventLog;
  }

  async list(tenantId?: string): Promise<EventLogRecord[]> {
    return (await EventLogModel.find(tenantId ? { tenantId } : {}).sort({ timestamp: -1 }).lean()) as unknown as EventLogRecord[];
  }

  async paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<EventLogRecord>> {
    const query = { tenantId };
    const [items, total] = await Promise.all([
      EventLogModel.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      EventLogModel.countDocuments(query)
    ]);
    return {
      items: items as unknown as EventLogRecord[],
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findDuplicate(criteria: EventDuplicateLookup): Promise<EventLogRecord | null> {
    const occurredAt = new Date(criteria.occurredAt);
    const from = new Date(occurredAt.getTime() - criteria.dedupeWindowMs).toISOString();
    const to = new Date(occurredAt.getTime() + criteria.dedupeWindowMs).toISOString();

    return (await EventLogModel.findOne({
      tenantId: criteria.tenantId,
      $or: [
        {
          sourceAdapter: criteria.sourceAdapter,
          sourceRef: criteria.sourceRef
        },
        {
          eventHash: criteria.eventHash,
          occurredAt: {
            $gte: from,
            $lte: to
          }
        }
      ]
    }).lean()) as unknown as EventLogRecord | null;
  }

  async listByIncidentId(incidentId: string): Promise<EventLogRecord[]> {
    return (await EventLogModel.find({ incidentId }).sort({ occurredAt: 1 }).lean()) as unknown as EventLogRecord[];
  }
}
