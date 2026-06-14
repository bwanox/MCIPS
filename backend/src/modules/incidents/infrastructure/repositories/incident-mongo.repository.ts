import type { IncidentRecord, PaginatedResult } from "../../../../shared/types/platform.js";
import type { IncidentRepository } from "../../domain/incident.repository.js";
import { IncidentModel } from "../models/incident.model.js";

export class IncidentMongoRepository implements IncidentRepository {
  async create(incident: IncidentRecord): Promise<IncidentRecord> {
    await IncidentModel.create(incident);
    return incident;
  }

  async update(incident: IncidentRecord): Promise<IncidentRecord> {
    await IncidentModel.updateOne({ id: incident.id }, incident, { upsert: true });
    return incident;
  }

  async list(tenantId?: string): Promise<IncidentRecord[]> {
    return (await IncidentModel.find(tenantId ? { tenantId } : {}).sort({ lastSeenAt: -1 }).lean()) as unknown as IncidentRecord[];
  }

  async paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<IncidentRecord>> {
    const query = { tenantId };
    const [items, total] = await Promise.all([
      IncidentModel.find(query).sort({ lastSeenAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      IncidentModel.countDocuments(query)
    ]);
    return {
      items: items as unknown as IncidentRecord[],
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: string): Promise<IncidentRecord | null> {
    return (await IncidentModel.findOne({ id }).lean()) as unknown as IncidentRecord | null;
  }
}
