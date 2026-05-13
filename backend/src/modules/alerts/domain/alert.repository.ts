import type { AlertRecord } from "../../../shared/types/platform.js";

export interface AlertRepository {
  create(alert: AlertRecord): Promise<AlertRecord>;
  list(): Promise<AlertRecord[]>;
  findById(id: string): Promise<AlertRecord | null>;
}
