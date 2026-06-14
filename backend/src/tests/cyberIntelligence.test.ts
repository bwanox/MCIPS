import { describe, expect, it } from "vitest";
import { mapAlertToMitre } from "../services/mitreMapping.service.js";
import { extractAndEnrichIndicators } from "../services/threatIntel.service.js";
import { calculateExplainableRisk } from "../services/riskScoring.service.js";
import { buildIncidentGraph } from "../services/incidentGraph.service.js";
import type { AlertRecord } from "../shared/types/platform.js";

describe("MITRE ATT&CK Engine", () => {
  it("should map phishing SMS with link to Initial Access Spearphishing Link", () => {
    const alertMock = {
      label: "phishing",
      features: ["credential_request"],
      message: "Votre compte CIH est bloque. Confirmez sur https://cih-verification.example",
      explanation: "Phishing SMS message with url"
    } as any;

    const mappings = mapAlertToMitre(alertMock);
    expect(mappings.length).toBeGreaterThanOrEqual(1);
    expect(mappings[0].tactic).toBe("Initial Access");
    expect(mappings[0].techniqueId).toBe("T1566");
    expect(mappings[0].technique).toBe("Phishing");
  });

  it("should map suspicious login to Valid Accounts", () => {
    const alertMock = {
      label: "suspicious_login",
      features: [],
      message: "Suspicious login attempt",
      explanation: "Login from unfamiliar location"
    } as any;

    const mappings = mapAlertToMitre(alertMock);
    expect(mappings[0].tactic).toBe("Initial Access");
    expect(mappings[0].techniqueId).toBe("T1078");
    expect(mappings[0].technique).toBe("Valid Accounts");
  });

  it("should map brute force login to Brute Force technique", () => {
    const alertMock = {
      label: "suspicious_login",
      features: ["failed_login_activity"],
      message: "Multiple failed logins",
      explanation: "Brute force pattern"
    } as any;

    const mappings = mapAlertToMitre(alertMock);
    expect(mappings[0].tactic).toBe("Credential Access");
    expect(mappings[0].techniqueId).toBe("T1110");
  });

  it("should return a explicit 'not mapped' reason for safe events", () => {
    const alertMock = {
      label: "safe",
      features: [],
      message: "Healthy login",
      explanation: "User login succeeded"
    } as any;

    const mappings = mapAlertToMitre(alertMock);
    expect(mappings).toEqual([]);
  });
});

describe("Threat Intelligence Enrichment", () => {
  it("should extract and enrich known malicious indicators from event payloads", () => {
    const payload = {
      content: "Verify your credentials on https://cih-verification.example",
      ip_address: "197.230.45.19",
      sender: "CIH-urgent"
    };

    const indicators = extractAndEnrichIndicators(payload, payload.content);

    // Should find the malicious domain, url, sender, brand
    const urls = indicators.filter(i => i.type === "url");
    const domains = indicators.filter(i => i.type === "domain");
    const ips = indicators.filter(i => i.type === "ip");
    const senders = indicators.filter(i => i.type === "sender");
    const brands = indicators.filter(i => i.type === "brand");

    expect(urls[0].reputation).toBe("malicious");
    expect(domains[0].value).toBe("cih-verification.example");
    expect(ips[0].reputation).toBe("malicious");
    expect(senders[0].reputation).toBe("malicious");
    expect(brands[0].value).toBe("CIH");
  });

  it("should fall back to clean/unknown for safe indicators", () => {
    const payload = {
      ip_address: "8.8.8.8",
      sender: "safe-sender@gmail.com"
    };

    const indicators = extractAndEnrichIndicators(payload);
    expect(indicators.some(i => i.value === "8.8.8.8" && i.reputation === "clean")).toBe(true);
  });
});

describe("Risk Scoring Engine", () => {
  it("should score alerts accurately based on threat intel and model confidence", () => {
    const draftAlert = {
      label: "phishing",
      risk: "HIGH" as const,
      confidence: 0.95,
      features: ["credential_request"]
    } as any;

    const indicators = [
      {
        type: "url" as const,
        value: "https://cih-verification.example",
        reputation: "malicious" as const,
        category: "Phishing",
        source: "Local Intel",
        confidence: 95,
        lastSeen: new Date().toISOString()
      }
    ];

    const result = calculateExplainableRisk({
      draftAlert,
      indicators,
      correlationDetected: false,
      event: { eventType: "sms.message.received" }
    });

    // Should have Base model confidence + Phishing indicators + Threat intel hit + Suspicious URL + ATT&CK technique severity
    // confidenceScore: 38
    // phishing indicators: 18
    // threat intel hit: 15
    // suspicious URL: 18
    // ATT&CK: 10
    expect(result.finalScore).toBeGreaterThanOrEqual(80);
    expect(result.factors.some(f => f.label === "Suspicious URL")).toBe(true);
  });

  it("should add correlation bonus to the risk score when correlation is detected", () => {
    const draftAlert = {
      label: "suspicious_login",
      risk: "HIGH" as const,
      confidence: 0.90,
      features: ["otp_request"]
    } as any;

    const indicators = [
      {
        type: "ip" as const,
        value: "197.230.45.19",
        reputation: "malicious" as const,
        category: "IP Rep",
        source: "Local Intel",
        confidence: 90,
        lastSeen: new Date().toISOString()
      }
    ];

    const result = calculateExplainableRisk({
      draftAlert,
      indicators,
      correlationDetected: true,
      event: { eventType: "auth.login.attempt" }
    });

    expect(result.correlationBonus).toBe(20);
    expect(result.factors.some(f => f.label === "Phishing followed by login")).toBe(true);
  });
});

describe("Incident Correlation Graph", () => {
  it("should compile a graph showing nodes, edges, and evidence chains", () => {
    const alertMock = {
      id: "alert-123",
      alertId: "alert-123",
      eventId: "event-123",
      tenantId: "tenant-demo",
      title: "Phishing SMS detected",
      label: "phishing",
      datasetFamily: "sms_threat",
      eventType: "sms.message.received",
      detectedBank: "CIH Bank",
      sanitizedPreview: "Verify on https://cih-verification.example",
      sanitizedPayload: {
        sender: "CIH-urgent",
        url: "https://cih-verification.example"
      }
    } as unknown as AlertRecord;

    const correlatedSignals = [
      {
        alertId: "alert-prev",
        eventId: "event-prev",
        eventType: "sms.message.received",
        datasetFamily: "sms_threat",
        label: "phishing",
        risk: "HIGH",
        title: "Prior Phishing",
        timestamp: new Date().toISOString()
      }
    ] as any;

    const graph = buildIncidentGraph(alertMock, correlatedSignals);

    expect(graph.nodes.length).toBeGreaterThan(2);
    expect(graph.edges.length).toBeGreaterThan(1);
    expect(graph.evidenceChain.length).toBeGreaterThan(0);
    
    // Check nodes existence
    expect(graph.nodes.some(n => n.type === "Tenant")).toBe(true);
    expect(graph.nodes.some(n => n.type === "Alert")).toBe(true);
    expect(graph.nodes.some(n => n.type === "URL")).toBe(true);

    // Check edges
    expect(graph.edges.some(e => e.type === "received")).toBe(true);
    expect(graph.edges.some(e => e.type === "contains")).toBe(true);
  });
});
