import { describe, expect, it } from "vitest";

import { privacySanitizer } from "../modules/events/application/services/privacy-sanitizer.js";

describe("privacySanitizer", () => {
  it("masks PII and bank names while keeping metadata", () => {
    const result = privacySanitizer(
      "Banque Populaire alert for john@example.com. OTP 934455 for account 123456789012 and call +212612345678."
    );

    expect(result.sanitizedContent).toContain("[BANK]");
    expect(result.sanitizedContent).toContain("[EMAIL]");
    expect(result.sanitizedContent).toContain("[ACCOUNT]");
    expect(result.sanitizedContent).toContain("[PHONE]");
    expect(result.piiDetected).toBe(true);
    expect(result.detectedBank?.toLowerCase()).toContain("banque populaire");
  });
});
