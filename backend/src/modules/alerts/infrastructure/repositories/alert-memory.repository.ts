import type { AlertRecord, PaginatedResult } from "../../../../shared/types/platform.js";
import type { AlertRepository } from "../../domain/alert.repository.js";

export class AlertMemoryRepository implements AlertRepository {
  private readonly alerts: AlertRecord[] = [];

  async create(alert: AlertRecord): Promise<AlertRecord> {
    this.alerts.unshift(alert);
    return alert;
  }

  async list(tenantId?: string): Promise<AlertRecord[]> {
    return this.alerts.filter((alert) => !tenantId || alert.tenantId === tenantId);
  }

  async paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<AlertRecord>> {
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

  async findRecentForCorrelation(tenantId: string, timestamp: string, windowMs: number): Promise<AlertRecord[]> {
    const current = new Date(timestamp).getTime();
    return this.alerts.filter(
      (alert) =>
        alert.tenantId === tenantId &&
        Math.abs(new Date(alert.timestamp).getTime() - current) <= windowMs
    );
  }

  async findById(id: string): Promise<AlertRecord | null> {
    return this.alerts.find((alert) => alert.id === id) ?? null;
  }
}
