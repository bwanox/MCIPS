import type { AlertRecord } from "../../../../shared/types/platform.js";
import type { AlertRepository } from "../../domain/alert.repository.js";
import { AlertModel } from "../models/alert.model.js";

export class AlertMongoRepository implements AlertRepository {
  async create(alert: AlertRecord): Promise<AlertRecord> {
    await AlertModel.create(alert);
    return alert;
  }

  async list(): Promise<AlertRecord[]> {
    return (await AlertModel.find().sort({ timestamp: -1 }).lean()) as unknown as AlertRecord[];
  }

  async findById(id: string): Promise<AlertRecord | null> {
    return (await AlertModel.findOne({ id }).lean()) as unknown as AlertRecord | null;
  }
}
