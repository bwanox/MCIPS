import type { AlertRepository } from "../../../alerts/domain/alert.repository.js";
import type { RiskLevel, StatsSummary, ThreatLabel, TimelinePoint } from "../../../../shared/types/platform.js";

const labelKeys: ThreatLabel[] = [
  "phishing",
  "scam",
  "safe",
  "toxic",
  "suspicious",
  "suspicious_login",
  "network_intrusion",
  "log_anomaly"
];
const riskKeys: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

export class StatsService {
  constructor(private readonly alertsRepository: AlertRepository) {}

  async getSummary(): Promise<StatsSummary> {
    const alerts = await this.alertsRepository.list();
    const topFeatures = new Map<string, number>();
    const datasetFamilies = new Map<string, number>();
    const eventTypes = new Map<string, number>();

    for (const alert of alerts) {
      for (const feature of alert.features) {
        topFeatures.set(feature, (topFeatures.get(feature) ?? 0) + 1);
      }
      datasetFamilies.set(alert.datasetFamily, (datasetFamilies.get(alert.datasetFamily) ?? 0) + 1);
      eventTypes.set(alert.eventType, (eventTypes.get(alert.eventType) ?? 0) + 1);
    }

    return {
      totalAlerts: alerts.length,
      highRiskAlerts: alerts.filter((alert) => alert.risk === "HIGH").length,
      mediumRiskAlerts: alerts.filter((alert) => alert.risk === "MEDIUM").length,
      lowRiskAlerts: alerts.filter((alert) => alert.risk === "LOW").length,
      phishingCount: alerts.filter((alert) => alert.label === "phishing").length,
      suspiciousLoginCount: alerts.filter((alert) => alert.label === "suspicious_login").length,
      averageConfidence:
        alerts.length === 0
          ? 0
          : Number((alerts.reduce((sum, alert) => sum + alert.confidence, 0) / alerts.length).toFixed(3)),
      riskDistribution: riskKeys.reduce(
        (accumulator, key) => ({ ...accumulator, [key]: alerts.filter((alert) => alert.risk === key).length }),
        {} as Record<RiskLevel, number>
      ),
      labelDistribution: labelKeys.reduce(
        (accumulator, key) => ({ ...accumulator, [key]: alerts.filter((alert) => alert.label === key).length }),
        {} as Record<ThreatLabel, number>
      ),
      datasetFamilyDistribution: [...datasetFamilies.entries()].map(([family, count]) => ({
        family: family as StatsSummary["datasetFamilyDistribution"][number]["family"],
        count
      })),
      eventTypeDistribution: [...eventTypes.entries()].map(([eventType, count]) => ({
        eventType: eventType as StatsSummary["eventTypeDistribution"][number]["eventType"],
        count
      })),
      topFeatures: [...topFeatures.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([feature, count]) => ({ feature, count })),
      recentAlerts: alerts.slice(0, 10)
    };
  }

  async getTimeline(range: "today" | "week" | "month"): Promise<TimelinePoint[]> {
    const alerts = await this.alertsRepository.list();
    const buckets = new Map<string, TimelinePoint>();
    const now = Date.now();
    const rangeWindow =
      range === "today" ? 24 * 60 * 60 * 1000 : range === "week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: range === "month" ? "2-digit" : undefined,
      month: "2-digit",
      day: "2-digit",
      hour: range === "today" ? "2-digit" : undefined
    });

    for (const alert of alerts) {
      if (now - new Date(alert.timestamp).getTime() > rangeWindow) {
        continue;
      }

      const bucket = formatter.format(new Date(alert.timestamp));
      const current =
        buckets.get(bucket) ??
        {
          bucket,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };

      current.total += 1;
      current[alert.severity] += 1;
      buckets.set(bucket, current);
    }

    return [...buckets.values()].sort((left, right) => left.bucket.localeCompare(right.bucket));
  }
}
