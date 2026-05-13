import type { Alert, RiskLevel, ThreatLabel } from "./alert";

export interface StatsSummary {
  totalAlerts: number;
  highRiskAlerts: number;
  phishingCount: number;
  suspiciousLoginCount: number;
  averageConfidence: number;
  riskDistribution: Record<RiskLevel, number>;
  labelDistribution: Record<ThreatLabel, number>;
  topFeatures: Array<{ feature: string; count: number }>;
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
