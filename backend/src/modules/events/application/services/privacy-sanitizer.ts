import { createHash } from "node:crypto";

import type { SanitizedEventResult } from "../../../../shared/types/platform.js";
import type { CyberEventEnvelope } from "../../../../types/cyberEvent.js";

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

const sanitizeText = (
  rawContent: string,
  options?: { maskIp?: boolean; maskSessionId?: boolean }
): {
  sanitizedContent: string;
  piiDetected: boolean;
  detectedBank?: string;
} => {
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
  applyMask(/\b(?:cin|cnie|id)\s*[:=-]?\s*[A-Z]{1,2}\d{4,10}\b/gi, "[ID]");

  if (options?.maskIp) {
    applyMask(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP]");
  }
  if (options?.maskSessionId) {
    applyMask(/\bsession(?:_id)?\s*[:=-]?\s*[A-Z0-9-]{6,}\b/gi, "[SESSION]");
    applyMask(/\buser(?:name)?\s*[:=-]?\s*[A-Z0-9._-]{3,}\b/gi, "[USER]");
  }

  return {
    sanitizedContent,
    piiDetected,
    detectedBank
  };
};

const buildPreview = (value: string): string => value.trim().slice(0, 180);

const sanitizeNaturalLanguagePayload = (event: CyberEventEnvelope): SanitizedEventResult => {
  const rawContent = typeof event.payload.content === "string" ? event.payload.content : "";
  const { sanitizedContent, piiDetected, detectedBank } = sanitizeText(rawContent);

  return {
    sanitizedPayload: {
      ...event.payload,
      content: sanitizedContent
    },
    sanitizedPreview: buildPreview(sanitizedContent),
    contentLength: rawContent.length,
    piiDetected,
    detectedBank,
    derivedFeatures: {}
  };
};

const sanitizeLoginPayload = (event: CyberEventEnvelope): SanitizedEventResult => {
  const content = typeof event.payload.content === "string" ? event.payload.content : "";
  const { sanitizedContent, piiDetected, detectedBank } = sanitizeText(content, {
    maskIp: true,
    maskSessionId: true
  });

  const payload = {
    ...event.payload,
    ...(content ? { content: sanitizedContent } : {}),
    ...(typeof event.payload.ip_address === "string" ? { ip_address: "[IP]" } : {})
  };

  return {
    sanitizedPayload: payload,
    sanitizedPreview: buildPreview(sanitizedContent || "Login attempt metadata captured"),
    contentLength: content.length,
    piiDetected,
    detectedBank,
    derivedFeatures: {}
  };
};

const deriveSafeTokens = (input: string): string[] =>
  [...new Set((input.toLowerCase().match(/[a-z]{4,}/g) ?? []).slice(0, 8))];

const sanitizePhishingPayload = (event: CyberEventEnvelope): SanitizedEventResult => {
  const emailText =
    typeof event.payload.email_text === "string"
      ? event.payload.email_text
      : typeof event.payload["Email Text"] === "string"
        ? event.payload["Email Text"]
        : "";
  const { sanitizedContent, piiDetected, detectedBank } = sanitizeText(emailText);
  const urlCount =
    typeof event.payload.url_count === "number"
      ? event.payload.url_count
      : (emailText.match(/https?:\/\/[^\s]+/g) ?? []).length;
  const hasHtml =
    typeof event.payload.has_html === "boolean"
      ? event.payload.has_html
      : /<\/?[a-z][\s\S]*>/i.test(emailText);
  const charCount = typeof event.payload.char_count === "number" ? event.payload.char_count : emailText.length;
  const wordCount =
    typeof event.payload.word_count === "number" ? event.payload.word_count : emailText.trim().split(/\s+/).filter(Boolean).length;
  const topTokens =
    Array.isArray(event.payload.top_tokens) && event.payload.top_tokens.every((item) => typeof item === "string")
      ? event.payload.top_tokens
      : emailText
        ? deriveSafeTokens(sanitizedContent)
        : undefined;

  const emailTextHash =
    typeof event.payload.email_text_hash === "string"
      ? event.payload.email_text_hash
      : emailText
        ? `sha256:${createHash("sha256").update(emailText).digest("hex")}`
        : undefined;

  return {
    sanitizedPayload: {
      ...event.payload,
      ...(emailTextHash ? { email_text_hash: emailTextHash } : {}),
      ...(topTokens ? { top_tokens: topTokens } : {}),
      char_count: charCount,
      word_count: wordCount,
      url_count: urlCount,
      has_html: hasHtml,
      email_text: undefined,
      "Email Text": undefined
    },
    sanitizedPreview: buildPreview(
      `Email features label=${typeof event.payload.label === "string" ? event.payload.label : "unknown"} urls=${urlCount} html=${hasHtml}`
    ),
    contentLength: emailText.length,
    piiDetected,
    detectedBank,
    derivedFeatures: {
      char_count: charCount,
      word_count: wordCount,
      url_count: urlCount,
      has_html: hasHtml,
      ...(topTokens ? { top_tokens: topTokens } : {})
    }
  };
};

const sanitizeNetworkPayload = (event: CyberEventEnvelope): SanitizedEventResult => {
  const payload = { ...event.payload };
  let piiDetected = false;

  if (typeof payload.source_ip === "string") {
    payload.source_ip = "[IP]";
    piiDetected = true;
  }
  if (typeof payload.destination_ip === "string") {
    payload.destination_ip = "[IP]";
    piiDetected = true;
  }

  return {
    sanitizedPayload: payload,
    sanitizedPreview: buildPreview(
      `Network event ${payload.protocol_type ?? "unknown"}/${payload.service ?? "unknown"} flag=${payload.flag ?? "?"} class=${payload.class ?? "unknown"}`
    ),
    contentLength: 0,
    piiDetected,
    derivedFeatures: {}
  };
};

const sanitizeLogPayload = (event: CyberEventEnvelope): SanitizedEventResult => {
  const rawMessage = typeof event.payload.message === "string" ? event.payload.message : "";
  const { sanitizedContent, piiDetected, detectedBank } = sanitizeText(rawMessage, {
    maskIp: true,
    maskSessionId: true
  });

  return {
    sanitizedPayload: {
      ...event.payload,
      message: sanitizedContent
    },
    sanitizedPreview: buildPreview(
      `${String(event.payload.log_level ?? "LOG")} in ${String(event.payload.component ?? "unknown")}: ${sanitizedContent}`
    ),
    contentLength: rawMessage.length,
    piiDetected,
    detectedBank,
    derivedFeatures: {}
  };
};

export const privacySanitizer = (event: CyberEventEnvelope): SanitizedEventResult => {
  switch (event.eventType) {
    case "sms.message.received":
    case "email.message.received":
    case "text.message.received":
      return sanitizeNaturalLanguagePayload(event);
    case "auth.login.attempt":
      return sanitizeLoginPayload(event);
    case "phishing.email.detected":
      return sanitizePhishingPayload(event);
    case "net.intrusion.suspected":
      return sanitizeNetworkPayload(event);
    case "log.anomaly.detected":
      return sanitizeLogPayload(event);
    default:
      return {
        sanitizedPayload: event.payload,
        sanitizedPreview: "",
        contentLength: 0,
        piiDetected: false,
        derivedFeatures: {}
      };
  }
};
