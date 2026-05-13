import type { AlertRecord } from "../../../../shared/types/platform.js";
import type { AlertRepository } from "../../domain/alert.repository.js";

export class AlertMemoryRepository implements AlertRepository {
  private readonly alerts: AlertRecord[] = [];

  async create(alert: AlertRecord): Promise<AlertRecord> {
    this.alerts.unshift(alert);
    return alert;
  }

  async list(): Promise<AlertRecord[]> {
    return [...this.alerts];
  }

  async findById(id: string): Promise<AlertRecord | null> {
    return this.alerts.find((alert) => alert.id === id) ?? null;
  }
}
