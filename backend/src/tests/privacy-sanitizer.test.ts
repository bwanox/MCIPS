import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { privacySanitizer } from "../modules/events/application/services/privacy-sanitizer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const redTeamCorpus = JSON.parse(
  readFileSync(join(testDir, "privacy-red-team-corpus.json"), "utf8")
) as Array<{
  category: string;
  content: string;
  mustContain: string;
  mustNotContain: string;
}>;

describe("privacySanitizer", () => {
  it("masks PII and bank names while keeping metadata", () => {
    const result = privacySanitizer({
      eventId: "evt-1",
      eventType: "sms.message.received",
      tenantId: "tenant-demo",
      source: "manual",
      sourceFamily: "messaging",
      sourceAdapter: "test-messaging",
      sourceRef: "evt-1",
      eventHash: "hash-evt-1",
      occurredAt: "2025-01-15T14:23:44.998Z",
      eventTimestampUtc: "2025-01-15T14:23:44.998Z",
      payload: {
        content:
          "Banque Populaire alert for john@example.com. OTP 934455 for account 123456789012 and call +212612345678."
      }
    });

    expect(String(result.sanitizedPayload.content)).toContain("[BANK]");
    expect(String(result.sanitizedPayload.content)).toContain("[EMAIL]");
    expect(String(result.sanitizedPayload.content)).toContain("[ACCOUNT]");
    expect(String(result.sanitizedPayload.content)).toContain("[PHONE]");
    expect(result.piiDetected).toBe(true);
    expect(result.detectedBank?.toLowerCase()).toContain("banque populaire");
  });

  it("masks the privacy red-team corpus without category leakage", () => {
    const leakageTotals: Record<string, number> = {};

    for (const item of redTeamCorpus) {
      const result = privacySanitizer({
        eventId: `evt-${item.category}`,
        eventType: "sms.message.received",
        tenantId: "tenant-demo",
        source: "manual",
        sourceFamily: "messaging",
        sourceAdapter: "privacy-test",
        sourceRef: item.category,
        eventHash: `hash-${item.category}`,
        occurredAt: "2025-01-15T14:23:44.998Z",
        eventTimestampUtc: "2025-01-15T14:23:44.998Z",
        payload: {
          content: item.content
        }
      });
      const sanitized = String(result.sanitizedPayload.content);
      leakageTotals[item.category] = sanitized.includes(item.mustNotContain) ? 1 : 0;
      expect(sanitized).toContain(item.mustContain);
    }

    expect(leakageTotals).toEqual(Object.fromEntries(redTeamCorpus.map((item) => [item.category, 0])));
  });
});
