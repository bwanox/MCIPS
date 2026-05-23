export interface SimulationStatus {
  running: boolean;
  intervalMs: number;
  scenario: "phishing-login";
  lastRunAt?: string;
  lastAlertAt?: string;
}

export interface ScenarioRunResult {
  scenario: "phishing-login";
  alerts: Array<{ id: string; incidentId: string; title: string }>;
  incidentId?: string;
  completedAt: string;
}
