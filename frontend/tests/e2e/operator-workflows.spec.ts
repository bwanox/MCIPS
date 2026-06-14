import { expect, test, type Page, type Route } from "@playwright/test";

const apiUrl = "http://localhost:4000";
const now = "2025-01-15T14:23:44.998Z";

const alert = {
  id: "alert-1",
  incidentId: "incident-1",
  incidentType: "correlated_account_compromise",
  correlationDetected: true,
  incidentSummary: "A phishing SMS was followed by a suspicious login.",
  recommendedActions: ["Force a password reset and invalidate active sessions."],
  correlatedSignals: [],
  explainableRisk: {
    baseScore: 82,
    correlationBonus: 15,
    finalScore: 97,
    escalated: true,
    factors: [{ key: "phishing", label: "Phishing indicators", weight: 18, detail: "Credential lure" }]
  },
  eventId: "event-1",
  tenantId: "tenant-demo",
  eventType: "sms.message.received",
  datasetFamily: "sms_threat",
  label: "phishing",
  risk: "HIGH",
  severity: "critical",
  confidence: 0.92,
  title: "Phishing SMS detected",
  message: "Detected phishing with HIGH risk",
  explanation: "Credential lure",
  features: ["credential_request"],
  source: "external",
  sourceFamily: "messaging",
  sourceAdapter: "go-agent",
  sourceRef: "sms-1",
  eventHash: "hash-1",
  occurredAt: now,
  sanitizedPreview: "[BANK] account blocked. Confirm [OTP] at [URL]",
  contentLength: 64,
  piiDetected: true,
  detectedBank: "CIH Bank",
  payloadSummary: { content: "[BANK] account blocked" },
  sanitizedPayload: { content: "[BANK] account blocked" },
  modelUsed: "rules_tfidf_hybrid_v1",
  fallbackUsed: false,
  timestamp: now,
  mitre: [
    {
      mappingType: "candidate",
      tactic: "Initial Access",
      techniqueId: "T1566",
      technique: "Phishing",
      reason: "Phishing link",
      confidence: 0.82,
      evidenceIds: ["E1"],
      officialUrl: "https://attack.mitre.org/techniques/T1566/"
    }
  ],
  threatIntel: []
};

const incident = {
  id: "incident-1",
  tenantId: "tenant-demo",
  status: "awaiting_approval",
  severity: "critical",
  triagePriority: "CRITICAL",
  sourceFamilies: ["messaging", "login"],
  firstSeenAt: now,
  lastSeenAt: now,
  summary: "A phishing SMS was followed by a suspicious login.",
  recommendedActions: ["Force a password reset and invalidate active sessions."],
  correlatedSignals: [],
  timeline: [
    {
      id: "timeline-1",
      alertId: "alert-1",
      eventId: "event-1",
      eventType: "sms.message.received",
      title: "Phishing SMS detected",
      summary: "Credential lure was detected.",
      sourceFamily: "messaging",
      sourceAdapter: "go-agent",
      occurredAt: now,
      severity: "critical",
      mitreTags: ["T1566"],
      riskChange: "+15 (Correlation Escalation)",
      recommendedAction: "Force a password reset and invalidate active sessions.",
      evidenceType: "sms.message.received",
      citationId: "T1"
    }
  ],
  evidence: [
    {
      id: "evidence-1",
      citationId: "E1",
      alertId: "alert-1",
      eventId: "event-1",
      title: "Phishing SMS detected",
      summary: "Sanitized phishing evidence.",
      occurredAt: now,
      sourceFamily: "messaging"
    }
  ],
  auditTrail: [],
  actions: [
    {
      id: "action-1",
      incidentId: "incident-1",
      label: "Force a password reset and invalidate active sessions.",
      actionKey: "force_password_reset",
      status: "pending",
      requiresApproval: true,
      executionMode: "approval",
      createdAt: now,
      updatedAt: now
    }
  ],
  notifications: [
    {
      id: "notification-1",
      kind: "approval_required",
      channel: "email",
      createdAt: now,
      delivered: false,
      deliveryStatus: "simulated",
      subject: "Approval required",
      recipient: "admin@mcips.local",
      provider: "dry_run"
    }
  ],
  aiProvenance: {
    summarySource: "local_model",
    summaryModelUsed: "rules_tfidf_hybrid_v1",
    summaryFallbackUsed: false,
    recommendedActionSource: "local_model",
    recommendedActionModelUsed: "rules_tfidf_hybrid_v1",
    recommendedActionFallbackUsed: false,
    approvalClassificationSource: "local_model",
    approvalClassificationModelUsed: "rules_tfidf_hybrid_v1",
    approvalClassificationFallbackUsed: false,
    approvalRequiredReason: "Password reset requires operator approval."
  },
  latestAlertId: "alert-1",
  latestEventId: "event-1",
  mitre: alert.mitre,
  threatIntel: [],
  graph: {
    evidenceChain: ["Phishing SMS", "Suspicious login"]
  }
};

const paginated = <T,>(items: T[]) => ({
  items,
  page: 1,
  limit: 20,
  total: items.length,
  totalPages: items.length ? 1 : 0
});

const fulfillJson = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS"
    },
    body: JSON.stringify(body)
  });

const mockApi = async (page: Page) => {
  await page.route(`${apiUrl}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, {});
      return;
    }

    if (url.pathname === "/api/auth/login") {
      await fulfillJson(route, {
        token: "test-token",
        user: { email: "admin@mcips.local", tenantId: "tenant-demo", role: "admin" }
      });
      return;
    }
    if (url.pathname === "/api/auth/me") {
      await fulfillJson(route, {
        user: { email: "admin@mcips.local", tenantId: "tenant-demo", role: "admin" }
      });
      return;
    }
    if (url.pathname === "/api/alerts/recent") {
      await fulfillJson(route, [alert]);
      return;
    }
    if (url.pathname === "/api/incidents") {
      await fulfillJson(route, paginated([incident]));
      return;
    }
    if (url.pathname === "/api/copilot/feed") {
      await fulfillJson(route, paginated([{ id: "feed-1", incidentId: "incident-1", title: "Priority case", summary: incident.summary, severity: "critical", sourceFamilies: ["messaging"], createdAt: now }]));
      return;
    }
    if (url.pathname === "/api/copilot/query") {
      await fulfillJson(route, {
        answer: "Start by reviewing and approving the password reset action.",
        citations: ["T1", "E1"],
        usedFallback: false,
        source: "local_model",
        modelUsed: "rules_tfidf_hybrid_v1"
      });
      return;
    }
    if (url.pathname === "/api/stats/summary") {
      await fulfillJson(route, {
        totalAlerts: 1,
        highRiskAlerts: 1,
        correlatedIncidentsCount: 1,
        datasetFamilyDistribution: [],
        recentAlerts: [alert]
      });
      return;
    }
    if (url.pathname === "/api/stats/timeline") {
      await fulfillJson(route, [{ bucket: now, total: 1, highRisk: 1 }]);
      return;
    }
    if (url.pathname === "/api/simulation/status") {
      await fulfillJson(route, { running: false, scenario: "phishing-login" });
      return;
    }
    if (url.pathname === "/api/simulation/scenarios/phishing-login") {
      await fulfillJson(route, { scenario: "phishing-login", alerts: [alert], incidents: [incident] });
      return;
    }
    if (url.pathname === "/api/simulation/once") {
      await fulfillJson(route, alert);
      return;
    }
    if (url.pathname === "/api/simulation/start") {
      await fulfillJson(route, { running: true, scenario: "phishing-login" });
      return;
    }
    if (url.pathname === "/api/simulation/stop") {
      await fulfillJson(route, { running: false, scenario: "phishing-login" });
      return;
    }
    if (url.pathname === "/api/incidents/incident-1/actions/action-1/approve") {
      await fulfillJson(route, {
        ...incident,
        actions: [
          {
            ...incident.actions[0],
            status: "simulated",
            executionMessage: "simulated action artifacts written successfully"
          }
        ]
      });
      return;
    }
    if (url.pathname === "/api/incidents/incident-1/actions/action-1/reject") {
      await fulfillJson(route, {
        ...incident,
        actions: [{ ...incident.actions[0], status: "rejected" }]
      });
      return;
    }
    if (url.pathname === "/health") {
      await fulfillJson(route, {
        backend: "ok",
        aiUrl: "http://ai-service:8000",
        dbMode: "mongo",
        databaseConnected: true,
        timestamp: now,
        agent: {
          online: true,
          service: "mcips-go-agent",
          backendReachable: true,
          queueDepth: 0,
          collectors: [{ name: "sms-file", path: "/app/runtime/sms-inbox.ndjson", healthy: true }],
          message: "agent online"
        }
      });
      return;
    }

    await fulfillJson(route, {});
  });
};

test("login redirects to dashboard", async ({ page }) => {
  await mockApi(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  await page.getByRole("button", { name: /Open SecureLens Dashboard/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test.describe("authenticated dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => window.localStorage.setItem("mcips_token", "test-token"));
  });

  test("loads dashboard and incident details", async ({ page }) => {
    await page.goto("/dashboard/incidents");
    await expect(page.getByText("Case queue")).toBeVisible();
    await expect(page.getByText("Timeline")).toBeVisible();
    await expect(page.getByText("Evidence")).toBeVisible();
    await expect(page.getByText("Force a password reset")).toBeVisible();
  });

  test("approves and rejects pending actions", async ({ page }) => {
    await page.goto("/dashboard/operations");
    await page.getByTitle("Approve").first().click();
    await expect(page.getByText(/simulated action artifacts/)).toBeVisible();

    await page.reload();
    await page.getByTitle("Reject").first().click();
    await expect(page.getByText(/rejected/)).toBeVisible();
  });

  test("runs the simulation scenario", async ({ page }) => {
    await page.goto("/dashboard/demo-lab");
    const response = page.waitForResponse(`${apiUrl}/api/simulation/scenarios/phishing-login`);
    await page.getByRole("button", { name: /Run scenario/ }).click();
    await expect((await response).ok()).toBeTruthy();
  });
});
