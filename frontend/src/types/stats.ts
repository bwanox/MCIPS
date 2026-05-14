import type { Alert, RiskLevel, ThreatLabel } from "./alert";
import type { CyberEventType } from "./event";
import type { DatasetFamily } from "./alert";

export interface StatsSummary {
  totalAlerts: number;
  correlatedIncidentsCount: number;
  highRiskAlerts: number;
  mediumRiskAlerts: number;
  lowRiskAlerts: number;
  phishingCount: number;
  suspiciousLoginCount: number;
  averageConfidence: number;
  riskDistribution: Record<RiskLevel, number>;
  labelDistribution: Record<ThreatLabel, number>;
  datasetFamilyDistribution: Array<{ family: DatasetFamily; count: number }>;
  eventTypeDistribution: Array<{ eventType: CyberEventType; count: number }>;
  topFeatures: Array<{ feature: string; count: number }>;
  topRiskFactors: Array<{ factor: string; count: number }>;
  recentAlerts: Alert[];
}

export interface TimelinePoint {
  bucket: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}
