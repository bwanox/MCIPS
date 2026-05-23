import type { IncidentRecord } from "../../../shared/types/platform.js";

export interface IncidentRepository {
  create(incident: IncidentRecord): Promise<IncidentRecord>;
  update(incident: IncidentRecord): Promise<IncidentRecord>;
  list(): Promise<IncidentRecord[]>;
  findById(id: string): Promise<IncidentRecord | null>;
}
