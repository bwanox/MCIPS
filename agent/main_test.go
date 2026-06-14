package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func testConfig(t *testing.T) appConfig {
	t.Helper()
	dir := t.TempDir()
	return appConfig{
		Addr:              ":0",
		BackendEventsURL:  "http://127.0.0.1:0/api/events",
		AgentToken:        "agent-token",
		CollectorKey:      "collector-key",
		SMSInboxPath:      filepath.Join(dir, "sms-inbox.ndjson"),
		AuthLogPath:       filepath.Join(dir, "auth-log.ndjson"),
		ArtifactOutputDir: filepath.Join(dir, "artifacts"),
		BlocklistPath:     filepath.Join(dir, "blocklist.txt"),
		DefaultTenant:     "tenant-demo",
		PollInterval:      time.Millisecond,
		RetryInterval:     time.Millisecond,
		QueueLimit:        10,
	}
}

func TestForwardEventUsesCollectorKey(t *testing.T) {
	var receivedKey string
	var received map[string]any
	cfg := testConfig(t)
	cfg.BackendEventsURL = "http://backend.test/api/events"
	app := newAgentApp(cfg)
	app.client = &http.Client{
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			receivedKey = request.Header.Get("X-Collector-Key")
			if request.Method != http.MethodPost {
				t.Fatalf("method = %s, want POST", request.Method)
			}
			if err := json.NewDecoder(request.Body).Decode(&received); err != nil {
				t.Fatalf("decode request: %v", err)
			}
			return &http.Response{
				StatusCode: http.StatusCreated,
				Body:       io.NopCloser(strings.NewReader("{}")),
				Header:     make(http.Header),
			}, nil
		}),
	}

	if err := app.forwardEvent(map[string]any{"event_type": "sms.message.received"}); err != nil {
		t.Fatalf("forwardEvent returned error: %v", err)
	}

	if receivedKey != cfg.CollectorKey {
		t.Fatalf("collector key = %q, want %q", receivedKey, cfg.CollectorKey)
	}
	if received["event_type"] != "sms.message.received" {
		t.Fatalf("event_type = %v", received["event_type"])
	}
	if !app.buildStatus().BackendReachable {
		t.Fatal("backend should be marked reachable after successful forwarding")
	}
}

func TestForwardEventReportsBackendFailure(t *testing.T) {
	cfg := testConfig(t)
	cfg.BackendEventsURL = "http://backend.test/api/events"
	app := newAgentApp(cfg)
	app.client = &http.Client{
		Transport: roundTripFunc(func(_ *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusBadGateway,
				Body:       io.NopCloser(strings.NewReader("downstream failed")),
				Header:     make(http.Header),
			}, nil
		}),
	}

	if err := app.forwardEvent(map[string]any{"event_type": "sms.message.received"}); err == nil {
		t.Fatal("forwardEvent returned nil error for failed backend")
	}
	if app.buildStatus().BackendReachable {
		t.Fatal("backend should remain unreachable after failed forwarding")
	}
}

func TestHealthIsPublicAndStatusRequiresBearerToken(t *testing.T) {
	app := newAgentApp(testConfig(t))
	routes := app.routes()

	healthRecorder := httptest.NewRecorder()
	routes.ServeHTTP(healthRecorder, httptest.NewRequest(http.MethodGet, "/agent/health", nil))
	if healthRecorder.Code != http.StatusOK {
		t.Fatalf("health status = %d, want 200", healthRecorder.Code)
	}

	statusRecorder := httptest.NewRecorder()
	routes.ServeHTTP(statusRecorder, httptest.NewRequest(http.MethodGet, "/agent/status", nil))
	if statusRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated status = %d, want 401", statusRecorder.Code)
	}

	request := httptest.NewRequest(http.MethodGet, "/agent/status", nil)
	request.Header.Set("Authorization", "Bearer agent-token")
	authorizedRecorder := httptest.NewRecorder()
	routes.ServeHTTP(authorizedRecorder, request)
	if authorizedRecorder.Code != http.StatusOK {
		t.Fatalf("authorized status = %d, want 200", authorizedRecorder.Code)
	}
}

func TestExecuteActionWritesSimulatedReceiptArtifacts(t *testing.T) {
	cfg := testConfig(t)
	app := newAgentApp(cfg)
	if err := app.ensureRuntimePaths(); err != nil {
		t.Fatalf("ensureRuntimePaths: %v", err)
	}

	result, err := app.executeAction(actionCommand{
		ActionID:   "action-1",
		IncidentID: "incident-1",
		ActionKey:  "force_password_reset",
		Label:      "Force password reset",
		Context: &actionContext{
			TenantID: "tenant-demo",
		},
	})
	if err != nil {
		t.Fatalf("executeAction returned error: %v", err)
	}

	if !result.Accepted || result.Outcome != "simulated" || result.Provider != "go_agent" {
		t.Fatalf("unexpected action result: %+v", result)
	}
	if len(result.ArtifactPaths) != 2 {
		t.Fatalf("artifact paths = %d, want 2", len(result.ArtifactPaths))
	}
	for _, path := range result.ArtifactPaths {
		if _, err := os.Stat(path); err != nil {
			t.Fatalf("artifact %s missing: %v", path, err)
		}
	}
	blocklist, err := os.ReadFile(cfg.BlocklistPath)
	if err != nil {
		t.Fatalf("read blocklist: %v", err)
	}
	if !strings.Contains(string(blocklist), "incident-1") {
		t.Fatalf("blocklist did not include incident id: %s", string(blocklist))
	}
	if app.buildStatus().LastActionExecutedAt == nil {
		t.Fatal("status should include last action timestamp")
	}
}

func TestUnsupportedActionIsForbidden(t *testing.T) {
	app := newAgentApp(testConfig(t))
	routes := app.routes()

	body, err := json.Marshal(actionCommand{
		ActionID:   "action-1",
		IncidentID: "incident-1",
		ActionKey:  "unsupported_action",
		Label:      "Unsupported action",
	})
	if err != nil {
		t.Fatalf("marshal command: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/agent/actions", bytes.NewReader(body))
	request.Header.Set("Authorization", "Bearer agent-token")
	request.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	routes.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("unsupported action status = %d, want 403", recorder.Code)
	}
}
