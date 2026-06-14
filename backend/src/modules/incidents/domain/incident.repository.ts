import type { IncidentRecord, PaginatedResult } from "../../../shared/types/platform.js";

export interface IncidentRepository {
  create(incident: IncidentRecord): Promise<IncidentRecord>;
  update(incident: IncidentRecord): Promise<IncidentRecord>;
  list(tenantId?: string): Promise<IncidentRecord[]>;
  paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<IncidentRecord>>;
  findById(id: string): Promise<IncidentRecord | null>;
}
