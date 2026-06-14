import type { AlertRecord, MitreMapping } from "../shared/types/platform.js";

type MappingInput = Partial<AlertRecord> & {
  label: string;
  features?: string[];
  message?: string;
  explanation?: string;
};

const candidate = (
  tactic: string,
  techniqueId: string,
  technique: string,
  reason: string,
  confidence: number
): MitreMapping => ({
  mappingType: "candidate",
  tactic,
  techniqueId,
  technique,
  reason,
  confidence,
  evidenceIds: [],
  officialUrl: `https://attack.mitre.org/techniques/${techniqueId.replace(".", "/")}/`
});

export const mapAlertToMitre = (alert: MappingInput): MitreMapping[] => {
  if (alert.label === "safe") return [];

  const features = alert.features ?? [];
  const message = (alert.message ?? "").toLowerCase();
  const explanation = (alert.explanation ?? "").toLowerCase();

  if (alert.label === "phishing" || alert.label === "scam") {
    const hasLink =
      features.includes("suspicious_link") ||
      message.includes("url") ||
      message.includes("link") ||
      explanation.includes("link");
    return [
      candidate(
        "Initial Access",
        hasLink ? "T1566.002" : "T1566",
        hasLink ? "Phishing: Spearphishing Link" : "Phishing",
        hasLink
          ? "The message contains a phishing lure and suspicious link evidence."
          : "The message contains phishing or social-engineering evidence.",
        hasLink ? 0.9 : 0.75
      )
    ];
  }

  if (alert.label === "suspicious_login") {
    const bruteForce =
      features.includes("failed_login_activity") ||
      message.includes("failed login") ||
      explanation.includes("brute");
    return bruteForce
      ? [
          candidate(
            "Credential Access",
            "T1110",
            "Brute Force",
            "Authentication evidence contains repeated failed-login or password-guessing behavior.",
            0.85
          )
        ]
      : [
          candidate(
            "Initial Access",
            "T1078",
            "Valid Accounts",
            "A valid-account login occurred from an unfamiliar device, IP, or access context.",
            0.7
          )
        ];
  }

  if (alert.label === "network_intrusion") {
    const discovery =
      features.includes("high_serror_rate") ||
      features.includes("high_rerror_rate") ||
      explanation.includes("scan") ||
      explanation.includes("discovery");
    return discovery
      ? [
          candidate(
            "Discovery",
            "T1046",
            "Network Service Discovery",
            "Network telemetry supports service-discovery or scanning behavior.",
            0.8
          )
        ]
      : [];
  }

  return [];
};
