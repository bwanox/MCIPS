export interface SimulationStatus {
  running: boolean;
  intervalMs: number;
  lastAlertAt?: string;
}
