import type { AlertRecord, MitreMapping } from "../shared/types/platform.js";

export const mapAlertToMitre = (alert: Partial<AlertRecord> & { label: string; features?: string[]; message?: string; explanation?: string }): MitreMapping[] => {
  if (alert.label === "safe") {
    return [];
  }

  const mappings: MitreMapping[] = [];
  const features = alert.features ?? [];
  const message = (alert.message ?? "").toLowerCase();
  const explanation = (alert.explanation ?? "").toLowerCase();

  if (alert.label === "phishing" || alert.label === "scam" || alert.label === "toxic") {
    const isOtp = features.includes("otp_request") || 
                  message.includes("otp") ||
                  explanation.includes("otp");
    const isCredential = features.includes("credential_request") ||
                         message.includes("credential") ||
                         message.includes("mot de passe") ||
                         message.includes("password") ||
                         explanation.includes("credential");

    if (isOtp || isCredential) {
      mappings.push({
        tactic: "Credential Access",
        techniqueId: "T1566",
        technique: "Phishing",
        reason: isOtp ? "Message contains OTP verification pressure lure" : "Message content contains credential theft attempt"
      });
    } else {
      mappings.push({
        tactic: "Initial Access",
        techniqueId: "T1566.002",
        technique: "Phishing: Spearphishing Link",
        reason: "Message contained credential lure and suspicious URL"
      });
    }
  } else if (alert.label === "suspicious_login") {
    const isBruteForce = features.includes("failed_login_activity") ||
                         message.includes("brute") ||
                         explanation.includes("brute") ||
                         message.includes("failed login") ||
                         explanation.includes("failed login");

    if (isBruteForce) {
      mappings.push({
        tactic: "Credential Access",
        techniqueId: "T1110",
        technique: "Brute Force",
        reason: "Authentication pattern suggests brute-force password guessing"
      });
    } else {
      mappings.push({
        tactic: "Initial Access",
        techniqueId: "T1078",
        technique: "Valid Accounts",
        reason: "Suspicious login attempt from unfamiliar device or IP"
      });
    }
  } else if (alert.label === "network_intrusion") {
    const isDiscovery = explanation.includes("scan") ||
                        features.includes("high_serror_rate") ||
                        features.includes("high_rerror_rate") ||
                        explanation.includes("discovery");

    const isPrivilegeEscalation = features.includes("root_shell_detected") ||
                                  features.includes("compromised_host_indicator") ||
                                  explanation.includes("shell") ||
                                  explanation.includes("privilege");

    if (isDiscovery) {
      mappings.push({
        tactic: "Discovery",
        techniqueId: "T1046",
        technique: "Network Service Discovery",
        reason: "Telemetry indicates port scanning or service discovery behavior"
      });
    } else if (isPrivilegeEscalation) {
      mappings.push({
        tactic: "Privilege Escalation",
        techniqueId: "T1068",
        technique: "Exploitation for Privilege Escalation",
        reason: "Intrusion payload detected compromised host or root shell attempt"
      });
    } else {
      mappings.push({
        tactic: "Exfiltration",
        techniqueId: "T1048",
        technique: "Exfiltration Over Alternative Protocol",
        reason: "Abnormal network packet telemetry suggesting exfiltration"
      });
    }
  } else if (alert.label === "log_anomaly" || alert.label === "suspicious") {
    mappings.push({
      tactic: "Defense Evasion",
      techniqueId: "T1562",
      technique: "Impair Defenses",
      reason: "Security logs or system component reported anomalous activity"
    });
  }

  if (mappings.length === 0) {
    mappings.push({
      tactic: "Not Mapped",
      techniqueId: "none",
      technique: "none",
      reason: "Explicit 'not mapped' reason: Unknown or unclassified threat label '" + alert.label + "'"
    });
  }

  return mappings;
};
