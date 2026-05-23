import type { IncidentRecord } from "../../../../shared/types/platform.js";
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

  async list(): Promise<IncidentRecord[]> {
    return (await IncidentModel.find().sort({ lastSeenAt: -1 }).lean()) as unknown as IncidentRecord[];
  }

  async findById(id: string): Promise<IncidentRecord | null> {
    return (await IncidentModel.findOne({ id }).lean()) as unknown as IncidentRecord | null;
  }
}
