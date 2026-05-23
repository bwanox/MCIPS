import { describe, expect, it } from "vitest";

import { privacySanitizer } from "../modules/events/application/services/privacy-sanitizer.js";

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
});
