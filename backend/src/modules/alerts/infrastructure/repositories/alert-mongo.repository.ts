import type { AlertRecord, PaginatedResult } from "../../../../shared/types/platform.js";
import type { AlertRepository } from "../../domain/alert.repository.js";
import { AlertModel } from "../models/alert.model.js";

export class AlertMongoRepository implements AlertRepository {
  async create(alert: AlertRecord): Promise<AlertRecord> {
    await AlertModel.create(alert);
    return alert;
  }

  async list(tenantId?: string): Promise<AlertRecord[]> {
    return (await AlertModel.find(tenantId ? { tenantId } : {}).sort({ timestamp: -1 }).lean()) as unknown as AlertRecord[];
  }

  async paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<AlertRecord>> {
    const query = { tenantId };
    const [items, total] = await Promise.all([
      AlertModel.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AlertModel.countDocuments(query)
    ]);
    return {
      items: items as unknown as AlertRecord[],
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findRecentForCorrelation(tenantId: string, timestamp: string, windowMs: number): Promise<AlertRecord[]> {
    const current = new Date(timestamp).getTime();
    const from = new Date(current - windowMs).toISOString();
    const to = new Date(current + windowMs).toISOString();
    return (await AlertModel.find({
      tenantId,
      timestamp: { $gte: from, $lte: to }
    }).sort({ timestamp: -1 }).limit(50).lean()) as unknown as AlertRecord[];
  }

  async findById(id: string): Promise<AlertRecord | null> {
    return (await AlertModel.findOne({ id }).lean()) as unknown as AlertRecord | null;
  }
}
