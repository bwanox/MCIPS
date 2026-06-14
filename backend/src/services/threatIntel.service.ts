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
        // Default safe/unknown indicator
        indicators.push({
          type,
          value: cleanValue,
          reputation: "clean",
          category: "General Metadata Indicator",
          source: "Local Fallback Database",
          confidence: 75,
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
