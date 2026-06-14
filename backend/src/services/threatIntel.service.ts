import type { ThreatIndicator } from "../shared/types/platform.js";

// Local reputation lookup list
const localReputationList: Record<string, Omit<ThreatIndicator, "value">> = {
  "cih-verification.example": {
    type: "domain",
    reputation: "malicious",
    category: "Phishing/Credential Theft",
    source: "Local Threat Feed",
    confidence: 95,
    lastSeen: new Date().toISOString()
  },
  "197.230.45.19": {
    type: "ip",
    reputation: "malicious",
    category: "Suspicious Login/Bot Activity",
    source: "Local Threat Feed",
    confidence: 90,
    lastSeen: new Date().toISOString()
  },
  "cih-urgent": {
    type: "sender",
    reputation: "malicious",
    category: "Brand Impersonation SMS Sender",
    source: "Local Threat Feed",
    confidence: 98,
    lastSeen: new Date().toISOString()
  },
  "cih": {
    type: "brand",
    reputation: "suspicious",
    category: "Moroccan Bank under spoofing campaign",
    source: "Local Threat Feed",
    confidence: 99,
    lastSeen: new Date().toISOString()
  },
  "https://cih-verification.example": {
    type: "url",
    reputation: "malicious",
    category: "Phishing Credential Lure",
    source: "Local Threat Feed",
    confidence: 97,
    lastSeen: new Date().toISOString()
  }
};

export const extractAndEnrichIndicators = (
  payload: Record<string, unknown>,
  previewText: string = "",
  detectedBank: string = ""
): ThreatIndicator[] => {
  const indicators: ThreatIndicator[] = [];
  const foundValues = new Set<string>();

  const addIndicator = (value: string, type: ThreatIndicator["type"]) => {
    const cleanValue = value.trim();
    if (!cleanValue || foundValues.has(cleanValue.toLowerCase())) return;
    foundValues.add(cleanValue.toLowerCase());

    // Clean URL trailing characters if any
    let lookupKey = cleanValue.toLowerCase();
    if (lookupKey.endsWith(".")) lookupKey = lookupKey.slice(0, -1);

    const localMatch = localReputationList[lookupKey];
    if (localMatch) {
      indicators.push({
        ...localMatch,
        value: cleanValue
      });
    } else {
      // Check if value contains any of the known local keys (e.g. cih-verification.example inside a URL)
      let foundKey = "";
      for (const key of Object.keys(localReputationList)) {
        if (lookupKey.includes(key) && localReputationList[key].type === type) {
          foundKey = key;
          break;
        }
      }

      if (foundKey) {
        indicators.push({
          ...localReputationList[foundKey],
          value: cleanValue
        });
      } else {
        // Dynamic threat intelligence evaluation based on value and payload context
        let reputation: ThreatIndicator["reputation"] = "clean";
        let category = "General Metadata Indicator";
        let confidence = 75;
        let source = "Local Heuristics Engine";

        const valLower = cleanValue.toLowerCase();

        if (type === "url" || type === "domain") {
          const safeDomains = ["google.com", "github.com", "microsoft.com", "apple.com", "facebook.com", "twitter.com", "linkedin.com", "cihbank.ma", "cihbank.co.ma", "cih.ma"];
          const isSafeDomain = safeDomains.some(d => valLower.includes(d));

          if (!isSafeDomain) {
            if (valLower.includes("cih")) {
              reputation = "malicious";
              category = "Brand Impersonation (CIH Bank)";
              confidence = 95;
            } else if (
              valLower.includes("verify") ||
              valLower.includes("verification") ||
              valLower.includes("compte") ||
              valLower.includes("bloque") ||
              valLower.includes("securite") ||
              valLower.includes("login") ||
              valLower.includes("signin") ||
              valLower.includes("update") ||
              valLower.includes("resolve") ||
              valLower.includes("auth") ||
              valLower.includes("support") ||
              valLower.includes("alert") ||
              valLower.includes("bank")
            ) {
              reputation = "malicious";
              category = "Phishing Credential Lure";
              confidence = 85;
            } else {
              const suspiciousTlds = [".xyz", ".top", ".info", ".online", ".site", ".vip", ".click", ".cc", ".tk", ".ml", ".ga", ".cf", ".gq", ".ru"];
              const hasSuspiciousTld = suspiciousTlds.some(tld => valLower.endsWith(tld) || valLower.includes(tld + "/"));
              if (hasSuspiciousTld) {
                reputation = "suspicious";
                category = "High-Risk Top Level Domain";
                confidence = 80;
              }
            }
          }
        } else if (type === "sender") {
          const highRiskSenders = ["cih", "bank", "alert", "security", "support", "attijari", "bp"];
          const isHighRiskSender = highRiskSenders.some(s => valLower.includes(s));
          const hasCredentialsKeywords = previewText.toLowerCase().includes("compte") || 
                                         previewText.toLowerCase().includes("bloque") || 
                                         previewText.toLowerCase().includes("password") ||
                                         previewText.toLowerCase().includes("login") ||
                                         previewText.toLowerCase().includes("verify") ||
                                         previewText.toLowerCase().includes("https://") ||
                                         previewText.toLowerCase().includes("http://");

          if (isHighRiskSender && hasCredentialsKeywords) {
            reputation = "malicious";
            category = "Spoofed Sender ID / Brand Impersonation";
            confidence = 95;
          } else if (
            valLower.endsWith("@gmail.com") ||
            valLower.endsWith("@yahoo.com") ||
            valLower.endsWith("@outlook.com") ||
            valLower.endsWith("@hotmail.com")
          ) {
            if (hasCredentialsKeywords) {
              reputation = "suspicious";
              category = "Free Mail Spoofing Campaign";
              confidence = 85;
            }
          }
        } else if (type === "ip") {
          const isPrivateIp = 
            valLower === "127.0.0.1" || 
            valLower === "localhost" ||
            valLower.startsWith("10.") ||
            valLower.startsWith("192.168.") ||
            valLower.startsWith("172.16.") ||
            valLower.startsWith("172.17.") ||
            valLower.startsWith("172.18.") ||
            valLower.startsWith("172.19.") ||
            valLower.startsWith("172.20.") ||
            valLower.startsWith("172.21.") ||
            valLower.startsWith("172.22.") ||
            valLower.startsWith("172.23.") ||
            valLower.startsWith("172.24.") ||
            valLower.startsWith("172.25.") ||
            valLower.startsWith("172.26.") ||
            valLower.startsWith("172.27.") ||
            valLower.startsWith("172.28.") ||
            valLower.startsWith("172.29.") ||
            valLower.startsWith("172.30.") ||
            valLower.startsWith("172.31.");

          if (isPrivateIp) {
            reputation = "clean";
            category = "Private/Local Network";
            confidence = 100;
          } else {
            const features = (payload.features || []) as string[];
            const isAnomaly = features.includes("failed_login_activity") || 
                              features.includes("log_anomaly") ||
                              features.includes("network_intrusion") ||
                              payload.label === "suspicious_login" ||
                              payload.label === "network_intrusion" ||
                              payload.risk === "HIGH" ||
                              (typeof payload.anomaly_score === "number" && payload.anomaly_score > 0.6);
            if (isAnomaly) {
              reputation = "malicious";
              category = "IP Flagged with Anomalous Activity";
              confidence = 90;
            } else {
              reputation = "clean";
              category = "External Unverified IP Address";
              confidence = 70;
            }
          }
        }

        indicators.push({
          type,
          value: cleanValue,
          reputation,
          category,
          source,
          confidence,
          lastSeen: new Date().toISOString()
        });
      }
    }
  };

  // 1. Bank Brand
  if (detectedBank) {
    addIndicator(detectedBank, "brand");
  }

  // 2. IP Address fields
  const ipFields = ["ip_address", "ip", "src_ip", "dst_ip", "ipAddress"];
  for (const field of ipFields) {
    if (typeof payload[field] === "string") {
      addIndicator(payload[field] as string, "ip");
    }
  }

  // 3. Sender fields
  const senderFields = ["sender", "from", "email", "phone", "sender_ref"];
  for (const field of senderFields) {
    if (typeof payload[field] === "string") {
      addIndicator(payload[field] as string, "sender");
    }
  }

  // 4. URL & Domain extraction
  const urlFields = ["url", "link", "href"];
  for (const field of urlFields) {
    if (typeof payload[field] === "string") {
      const urlStr = payload[field] as string;
      addIndicator(urlStr, "url");
      try {
        const urlObj = new URL(urlStr);
        addIndicator(urlObj.hostname, "domain");
      } catch {
        const hostMatch = urlStr.match(/https?:\/\/([^/]+)/);
        if (hostMatch?.[1]) {
          addIndicator(hostMatch[1], "domain");
        }
      }
    }
  }

  // Parse previewText and content for URLs
  const urlRegex = /(https?:\/\/[^\s"'`]+)/g;
  let match;
  while ((match = urlRegex.exec(previewText)) !== null) {
    const urlStr = match[1];
    addIndicator(urlStr, "url");
    try {
      const urlObj = new URL(urlStr);
      addIndicator(urlObj.hostname, "domain");
    } catch {
      const hostMatch = urlStr.match(/https?:\/\/([^/]+)/);
      if (hostMatch?.[1]) {
        addIndicator(hostMatch[1], "domain");
      }
    }
  }

  // 5. Look for brand mentions
  const textToScan = `${previewText} ${JSON.stringify(payload)}`.toLowerCase();
  if (textToScan.includes("cih")) {
    addIndicator("CIH", "brand");
  }

  return indicators;
};
