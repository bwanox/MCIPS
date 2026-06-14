import type { AlertRecord, PaginatedResult } from "../../../shared/types/platform.js";

export interface AlertRepository {
  create(alert: AlertRecord): Promise<AlertRecord>;
  list(tenantId?: string): Promise<AlertRecord[]>;
  paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<AlertRecord>>;
  findRecentForCorrelation(tenantId: string, timestamp: string, windowMs: number): Promise<AlertRecord[]>;
  findById(id: string): Promise<AlertRecord | null>;
}
