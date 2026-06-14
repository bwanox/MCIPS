import type { IncidentRecord, PaginatedResult } from "../../../../shared/types/platform.js";
import type { IncidentRepository } from "../../domain/incident.repository.js";

export class IncidentMemoryRepository implements IncidentRepository {
  private readonly incidents: IncidentRecord[] = [];

  async create(incident: IncidentRecord): Promise<IncidentRecord> {
    this.incidents.unshift(incident);
    return incident;
  }

  async update(incident: IncidentRecord): Promise<IncidentRecord> {
    const index = this.incidents.findIndex((entry) => entry.id === incident.id);
    if (index >= 0) {
      this.incidents.splice(index, 1);
      this.incidents.unshift(incident);
    } else {
      this.incidents.unshift(incident);
    }
    return incident;
  }

  async list(tenantId?: string): Promise<IncidentRecord[]> {
    return this.incidents.filter((incident) => !tenantId || incident.tenantId === tenantId);
  }

  async paginate(tenantId: string, page: number, limit: number): Promise<PaginatedResult<IncidentRecord>> {
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

  async findById(id: string): Promise<IncidentRecord | null> {
    return this.incidents.find((incident) => incident.id === id) ?? null;
  }
}
