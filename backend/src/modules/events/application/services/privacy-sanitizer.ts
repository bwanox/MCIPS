import type { SanitizedContentResult } from "../../../../shared/types/platform.js";

const bankPatterns = [
  /attijariwafa bank/gi,
  /banque populaire/gi,
  /bmce bank/gi,
  /bank of africa/gi,
  /cih bank/gi,
  /credit du maroc/gi,
  /al barid bank/gi
];

const maskRule = (value: string, pattern: RegExp, replacement: string): string =>
  value.replace(pattern, replacement);

export const privacySanitizer = (rawContent: string): SanitizedContentResult => {
  let sanitizedContent = rawContent;
  let piiDetected = false;
  let detectedBank: string | undefined;

  const applyMask = (pattern: RegExp, replacement: string): void => {
    if (pattern.test(sanitizedContent)) {
      piiDetected = true;
      sanitizedContent = maskRule(sanitizedContent, pattern, replacement);
    }
  };

  bankPatterns.forEach((pattern) => {
    const match = sanitizedContent.match(pattern);
    if (match && !detectedBank) {
      detectedBank = match[0];
      piiDetected = true;
      sanitizedContent = sanitizedContent.replace(pattern, "[BANK]");
    }
  });

  applyMask(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]");
  applyMask(/(?:\+212|0)(?:\s?\d){9,}/g, "[PHONE]");
  applyMask(/\b(?:otp|code|pin)\s*[:=-]?\s*\d{4,8}\b/gi, "[OTP]");
  applyMask(/\b\d{10,18}\b/g, "[ACCOUNT]");
  applyMask(/\b[A-Z]{1,2}\d{5,10}\b/gi, "[ID]");
  applyMask(/https?:\/\/[^\s]+/gi, "[URL]");
  applyMask(/\b(?:mr|mrs|ms)\.?\s+[A-Z][a-z]+\b/g, "[NAME]");

  const sanitizedPreview = sanitizedContent.slice(0, 180);

  return {
    sanitizedContent,
    sanitizedPreview,
    piiDetected,
    detectedBank,
    contentLength: rawContent.length
  };
};
