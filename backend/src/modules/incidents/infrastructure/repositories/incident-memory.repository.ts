import type { IncidentRecord } from "../../../../shared/types/platform.js";
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

  async list(): Promise<IncidentRecord[]> {
    return [...this.incidents];
  }

  async findById(id: string): Promise<IncidentRecord | null> {
    return this.incidents.find((incident) => incident.id === id) ?? null;
  }
}
