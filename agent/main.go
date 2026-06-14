package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type appConfig struct {
	Addr              string
	BackendEventsURL  string
	AgentToken        string
	CollectorKey      string
	SMSInboxPath      string
	AuthLogPath       string
	ArtifactOutputDir string
	BlocklistPath     string
	DefaultTenant     string
	PollInterval      time.Duration
	RetryInterval     time.Duration
	QueueLimit        int
}

type collectorState struct {
	Name        string  `json:"name"`
	Path        string  `json:"path"`
	Healthy     bool    `json:"healthy"`
	LastEventAt *string `json:"lastEventAt,omitempty"`
	Error       string  `json:"error,omitempty"`
	Offset      int     `json:"-"`
}

type runtimeState struct {
	sync.Mutex
	BackendReachable      bool             `json:"backendReachable"`
	LastEventForwardedAt  *string          `json:"lastEventForwardedAt,omitempty"`
	LastActionExecutedAt  *string          `json:"lastActionExecutedAt,omitempty"`
	LastActionArtifact    []string         `json:"lastActionArtifactPaths,omitempty"`
	LastActionMessage     string           `json:"message"`
	Collectors            map[string]*collectorState
}

type pendingEvent struct {
	Payload map[string]any
}

type actionContext struct {
	Summary            string   `json:"summary"`
	SourceFamilies     []string `json:"sourceFamilies"`
	RecommendedActions []string `json:"recommendedActions"`
	TenantID           string   `json:"tenantId"`
}

type actionCommand struct {
	ActionID   string         `json:"actionId"`
	IncidentID string         `json:"incidentId"`
	ActionKey  string         `json:"actionKey"`
	Label      string         `json:"label"`
	Context    *actionContext `json:"context,omitempty"`
}

type actionResponse struct {
	Accepted      bool     `json:"accepted"`
	Outcome       string   `json:"outcome"`
	Provider      string   `json:"provider"`
	Message       string   `json:"message"`
	ArtifactPaths []string `json:"artifactPaths,omitempty"`
}

type statusResponse struct {
	Online                bool             `json:"online"`
	Service               string           `json:"service"`
	BackendReachable      bool             `json:"backendReachable"`
	QueueDepth            int              `json:"queueDepth"`
	LastEventForwardedAt  *string          `json:"lastEventForwardedAt,omitempty"`
	LastActionExecutedAt  *string          `json:"lastActionExecutedAt,omitempty"`
	LastActionArtifact    []string         `json:"lastActionArtifactPaths,omitempty"`
	Collectors            []*collectorState `json:"collectors"`
	Message               string           `json:"message"`
}

type smsInput struct {
	TenantID   string `json:"tenantId"`
	MessageID  string `json:"messageId"`
	Content    string `json:"content"`
	Sender     string `json:"sender"`
	OccurredAt string `json:"occurredAt"`
}

type authInput struct {
	TenantID   string `json:"tenantId"`
	EntryID    string `json:"entryId"`
	Content    string `json:"content"`
	IPAddress  string `json:"ip_address"`
	Country    string `json:"country"`
	Device     string `json:"device"`
	UserAgent  string `json:"user_agent"`
	OccurredAt string `json:"occurredAt"`
}

type agentApp struct {
	cfg    appConfig
	client *http.Client

	state runtimeState

	queueMu sync.Mutex
	queue   []pendingEvent
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDurationMs(key string, fallback int) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return time.Duration(fallback) * time.Millisecond
	}

	ms := fallback
	parsed, err := fmt.Sscanf(value, "%d", &ms)
	if err != nil || parsed == 0 {
		return time.Duration(fallback) * time.Millisecond
	}
	return time.Duration(ms) * time.Millisecond
}

func loadConfig() appConfig {
	return appConfig{
		Addr:              env("AGENT_ADDR", ":4100"),
		BackendEventsURL:  strings.TrimRight(env("BACKEND_EVENTS_URL", "http://127.0.0.1:4000/api/events"), "/"),
		AgentToken:        env("AGENT_API_TOKEN", ""),
		CollectorKey:      env("COLLECTOR_API_KEY", ""),
		SMSInboxPath:      env("AGENT_SMS_INBOX_PATH", "./runtime/sms-inbox.ndjson"),
		AuthLogPath:       env("AGENT_AUTH_LOG_PATH", "./runtime/auth-log.ndjson"),
		ArtifactOutputDir: env("AGENT_ARTIFACT_OUTPUT_DIR", "./runtime/artifacts"),
		BlocklistPath:     env("AGENT_BLOCKLIST_PATH", "./runtime/blocklist.txt"),
		DefaultTenant:     env("AGENT_DEFAULT_TENANT", "tenant-demo"),
		PollInterval:      envDurationMs("AGENT_POLL_INTERVAL_MS", 1000),
		RetryInterval:     envDurationMs("AGENT_RETRY_INTERVAL_MS", 1500),
		QueueLimit:        envInt("AGENT_QUEUE_LIMIT", 200),
	}
}

func newAgentApp(cfg appConfig) *agentApp {
	app := &agentApp{
		cfg: cfg,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		state: runtimeState{
			BackendReachable: false,
			LastActionMessage: "agent starting",
			Collectors: map[string]*collectorState{
				"sms-file": {
					Name:    "sms-file",
					Path:    cfg.SMSInboxPath,
					Healthy: true,
				},
				"auth-log": {
					Name:    "auth-log",
					Path:    cfg.AuthLogPath,
					Healthy: true,
				},
			},
		},
		queue: make([]pendingEvent, 0, cfg.QueueLimit),
	}

	return app
}

func (app *agentApp) ensureRuntimePaths() error {
	paths := []string{
		filepath.Dir(app.cfg.SMSInboxPath),
		filepath.Dir(app.cfg.AuthLogPath),
		app.cfg.ArtifactOutputDir,
		filepath.Dir(app.cfg.BlocklistPath),
	}

	for _, path := range paths {
		if path == "." || path == "" {
			continue
		}
		if err := os.MkdirAll(path, 0o755); err != nil {
			return err
		}
	}

	for _, path := range []string{app.cfg.SMSInboxPath, app.cfg.AuthLogPath, app.cfg.BlocklistPath} {
		if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
			if err := os.WriteFile(path, []byte(""), 0o644); err != nil {
				return err
			}
		}
	}

	return nil
}

func withAgentAuth(next http.HandlerFunc, token string) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		if token == "" {
			next(writer, request)
			return
		}

		if request.Header.Get("Authorization") != "Bearer "+token {
			http.Error(writer, "unauthorized", http.StatusUnauthorized)
			return
		}

		next(writer, request)
	}
}

func hashString(value string) string {
	digest := sha256.Sum256([]byte(value))
	return hex.EncodeToString(digest[:])
}

func normalizedOccurredAt(value string) string {
	if strings.TrimSpace(value) == "" {
		return time.Now().UTC().Format(time.RFC3339)
	}
	return value
}

func smsHints(content string) ([]string, []string, float64) {
	normalized := strings.ToLower(content)
	hints := []string{"messaging_source"}
	signals := make([]string, 0, 4)
	confidence := 0.35

	if strings.Contains(normalized, "otp") || strings.Contains(normalized, "code") {
		signals = append(signals, "otp_lure")
		confidence += 0.2
	}
	if strings.Contains(normalized, "http://") || strings.Contains(normalized, "https://") {
		signals = append(signals, "embedded_link")
		confidence += 0.2
	}
	if strings.Contains(normalized, "cih") || strings.Contains(normalized, "bank") || strings.Contains(normalized, "compte") {
		signals = append(signals, "financial_impersonation")
		hints = append(hints, "banking_context")
		confidence += 0.15
	}
	if strings.Contains(normalized, "bloque") || strings.Contains(normalized, "urgent") || strings.Contains(normalized, "maintenant") {
		signals = append(signals, "urgent_pressure")
		confidence += 0.1
	}

	if confidence > 0.95 {
		confidence = 0.95
	}
	return hints, signals, confidence
}

func authHints(input authInput) ([]string, []string, float64) {
	hints := []string{"auth_source"}
	signals := make([]string, 0, 4)
	confidence := 0.4
	device := strings.ToLower(input.Device)
	country := strings.ToLower(input.Country)
	userAgent := strings.ToLower(input.UserAgent)

	if strings.Contains(device, "unknown") || strings.Contains(device, "new") {
		signals = append(signals, "unknown_device")
		confidence += 0.15
	}
	if strings.Contains(country, "unknown") || country == "" {
		signals = append(signals, "unknown_country")
		confidence += 0.1
	}
	if strings.Contains(userAgent, "bot") || strings.Contains(userAgent, "curl") || strings.Contains(userAgent, "headless") {
		signals = append(signals, "suspicious_user_agent")
		confidence += 0.2
	}
	if strings.TrimSpace(input.IPAddress) != "" {
		hints = append(hints, "ip_context_available")
	}

	if confidence > 0.95 {
		confidence = 0.95
	}
	return hints, signals, confidence
}

func (app *agentApp) buildSMSEvent(input smsInput, rawLine string, lineIndex int) map[string]any {
	tenantID := strings.TrimSpace(input.TenantID)
	if tenantID == "" {
		tenantID = app.cfg.DefaultTenant
	}

	occurredAt := normalizedOccurredAt(input.OccurredAt)
	sourceRef := strings.TrimSpace(input.MessageID)
	if sourceRef == "" {
		sourceRef = fmt.Sprintf("sms-%d-%s", lineIndex, hashString(rawLine)[:12])
	}

	payload := map[string]any{
		"content": input.Content,
	}
	if strings.TrimSpace(input.Sender) != "" {
		payload["sender"] = input.Sender
	}

	eventHash := hashString(strings.Join([]string{tenantID, "sms-file", sourceRef, input.Content, occurredAt}, "|"))
	hints, signals, confidence := smsHints(input.Content)

	return map[string]any{
		"event_type":          "sms.message.received",
		"tenant_id":           tenantID,
		"source":              "external",
		"source_family":       "messaging",
		"source_adapter":      "sms-file",
		"source_ref":          sourceRef,
		"event_hash":          eventHash,
		"occurred_at":         occurredAt,
		"event_timestamp_utc": occurredAt,
		"agent_hints":         hints,
		"local_risk_signals":  signals,
		"collector_confidence": confidence,
		"payload":             payload,
	}
}

func (app *agentApp) buildAuthEvent(input authInput, rawLine string, lineIndex int) map[string]any {
	tenantID := strings.TrimSpace(input.TenantID)
	if tenantID == "" {
		tenantID = app.cfg.DefaultTenant
	}

	occurredAt := normalizedOccurredAt(input.OccurredAt)
	sourceRef := strings.TrimSpace(input.EntryID)
	if sourceRef == "" {
		sourceRef = fmt.Sprintf("auth-%d-%s", lineIndex, hashString(rawLine)[:12])
	}

	content := strings.TrimSpace(input.Content)
	if content == "" {
		content = "Suspicious login attempt detected from local auth log"
	}

	payload := map[string]any{
		"content":    content,
		"ip_address": input.IPAddress,
		"country":    input.Country,
		"device":     input.Device,
		"user_agent": input.UserAgent,
	}

	eventHash := hashString(strings.Join([]string{tenantID, "auth-log", sourceRef, content, occurredAt}, "|"))
	hints, signals, confidence := authHints(input)

	return map[string]any{
		"event_type":          "auth.login.attempt",
		"tenant_id":           tenantID,
		"source":              "external",
		"source_family":       "login",
		"source_adapter":      "auth-log",
		"source_ref":          sourceRef,
		"event_hash":          eventHash,
		"occurred_at":         occurredAt,
		"event_timestamp_utc": occurredAt,
		"agent_hints":         hints,
		"local_risk_signals":  signals,
		"collector_confidence": confidence,
		"payload":             payload,
	}
}

func (app *agentApp) enqueueEvent(payload map[string]any) {
	app.queueMu.Lock()
	defer app.queueMu.Unlock()

	if len(app.queue) >= app.cfg.QueueLimit {
		app.queue = app.queue[1:]
	}

	app.queue = append(app.queue, pendingEvent{Payload: payload})
}

func (app *agentApp) queueDepth() int {
	app.queueMu.Lock()
	defer app.queueMu.Unlock()
	return len(app.queue)
}

func (app *agentApp) dequeueEvent() (pendingEvent, bool) {
	app.queueMu.Lock()
	defer app.queueMu.Unlock()

	if len(app.queue) == 0 {
		return pendingEvent{}, false
	}

	item := app.queue[0]
	app.queue = app.queue[1:]
	return item, true
}

func (app *agentApp) prependEvent(item pendingEvent) {
	app.queueMu.Lock()
	defer app.queueMu.Unlock()
	app.queue = append([]pendingEvent{item}, app.queue...)
	if len(app.queue) > app.cfg.QueueLimit {
		app.queue = app.queue[:app.cfg.QueueLimit]
	}
}

func (app *agentApp) setCollectorError(name string, err error) {
	app.state.Lock()
	defer app.state.Unlock()

	collector := app.state.Collectors[name]
	if collector == nil {
		return
	}
	collector.Healthy = err == nil
	if err != nil {
		collector.Error = err.Error()
	} else {
		collector.Error = ""
	}
}

func (app *agentApp) setCollectorLastEvent(name string, occurredAt string) {
	app.state.Lock()
	defer app.state.Unlock()

	collector := app.state.Collectors[name]
	if collector == nil {
		return
	}
	collector.Healthy = true
	collector.Error = ""
	collector.LastEventAt = &occurredAt
}

func (app *agentApp) collectNewLines(name string, path string, processor func(line string, lineIndex int) error) error {
	app.state.Lock()
	collector := app.state.Collectors[name]
	app.state.Unlock()

	if collector == nil {
		return fmt.Errorf("collector %s not found", name)
	}

	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	if collector.Offset > len(content) {
		collector.Offset = 0
	}

	newBytes := content[collector.Offset:]
	if len(newBytes) == 0 {
		return nil
	}

	lines := strings.Split(string(newBytes), "\n")
	baseOffset := collector.Offset
	for index, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		if err := processor(trimmed, baseOffset+index); err != nil {
			return err
		}
	}

	collector.Offset = len(content)
	return nil
}

func (app *agentApp) runSMSCollector() {
	ticker := time.NewTicker(app.cfg.PollInterval)
	defer ticker.Stop()

	for {
		if err := app.collectNewLines("sms-file", app.cfg.SMSInboxPath, func(line string, lineIndex int) error {
			var input smsInput
			if err := json.Unmarshal([]byte(line), &input); err != nil {
				return fmt.Errorf("invalid sms line: %w", err)
			}
			payload := app.buildSMSEvent(input, line, lineIndex)
			app.enqueueEvent(payload)
			app.setCollectorLastEvent("sms-file", payload["occurred_at"].(string))
			return nil
		}); err != nil {
			app.setCollectorError("sms-file", err)
		} else {
			app.setCollectorError("sms-file", nil)
		}

		<-ticker.C
	}
}

func (app *agentApp) runAuthCollector() {
	ticker := time.NewTicker(app.cfg.PollInterval)
	defer ticker.Stop()

	for {
		if err := app.collectNewLines("auth-log", app.cfg.AuthLogPath, func(line string, lineIndex int) error {
			var input authInput
			if err := json.Unmarshal([]byte(line), &input); err != nil {
				return fmt.Errorf("invalid auth log line: %w", err)
			}
			payload := app.buildAuthEvent(input, line, lineIndex)
			app.enqueueEvent(payload)
			app.setCollectorLastEvent("auth-log", payload["occurred_at"].(string))
			return nil
		}); err != nil {
			app.setCollectorError("auth-log", err)
		} else {
			app.setCollectorError("auth-log", nil)
		}

		<-ticker.C
	}
}

func (app *agentApp) forwardEvent(payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	request, err := http.NewRequest(http.MethodPost, app.cfg.BackendEventsURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Collector-Key", app.cfg.CollectorKey)

	response, err := app.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("backend returned %d", response.StatusCode)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	app.state.Lock()
	app.state.BackendReachable = true
	app.state.LastEventForwardedAt = &now
	app.state.LastActionMessage = "events forwarding normally"
	app.state.Unlock()
	return nil
}

func (app *agentApp) runForwarder() {
	ticker := time.NewTicker(app.cfg.RetryInterval)
	defer ticker.Stop()

	for {
		item, ok := app.dequeueEvent()
		if ok {
			if err := app.forwardEvent(item.Payload); err != nil {
				app.state.Lock()
				app.state.BackendReachable = false
				app.state.LastActionMessage = fmt.Sprintf("backend forwarding degraded: %s", err.Error())
				app.state.Unlock()
				app.prependEvent(item)
			}
		}

		<-ticker.C
	}
}

func (app *agentApp) executeAction(command actionCommand) (actionResponse, error) {
	allowed := map[string]bool{
		"force_password_reset": true,
		"block_indicator":      true,
		"create_review_task":   true,
		"inspect_host":         true,
		"notify_target":        true,
	}
	if !allowed[command.ActionKey] {
		return actionResponse{}, fmt.Errorf("action not allowed")
	}

	timestamp := time.Now().UTC().Format(time.RFC3339)
	baseName := fmt.Sprintf("%s-%s", command.IncidentID, command.ActionID)
	artifactPath := filepath.Join(app.cfg.ArtifactOutputDir, fmt.Sprintf("%s.json", baseName))

	artifact := map[string]any{
		"incidentId": command.IncidentID,
		"actionId":   command.ActionID,
		"actionKey":  command.ActionKey,
		"label":      command.Label,
		"timestamp":  timestamp,
		"context":    command.Context,
	}

	payload, err := json.MarshalIndent(artifact, "", "  ")
	if err != nil {
		return actionResponse{}, err
	}
	if err := os.WriteFile(artifactPath, payload, 0o644); err != nil {
		return actionResponse{}, err
	}

	artifactPaths := []string{artifactPath}
	blocklistLine := fmt.Sprintf("%s\t%s\t%s\t%s\n", timestamp, command.IncidentID, command.ActionKey, command.Label)
	if command.ActionKey == "force_password_reset" || command.ActionKey == "block_indicator" {
		file, err := os.OpenFile(app.cfg.BlocklistPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if err != nil {
			return actionResponse{}, err
		}
		if _, err := file.WriteString(blocklistLine); err != nil {
			_ = file.Close()
			return actionResponse{}, err
		}
		_ = file.Close()
		artifactPaths = append(artifactPaths, app.cfg.BlocklistPath)
	}

	app.state.Lock()
	app.state.LastActionExecutedAt = &timestamp
	app.state.LastActionArtifact = artifactPaths
	app.state.LastActionMessage = "approved action artifact written"
	app.state.Unlock()

	return actionResponse{
		Accepted:      true,
		Outcome:       "simulated",
		Provider:      "go_agent",
		Message:       "simulated action artifacts written successfully",
		ArtifactPaths: artifactPaths,
	}, nil
}

func (app *agentApp) buildStatus() statusResponse {
	app.state.Lock()
	defer app.state.Unlock()

	collectors := make([]*collectorState, 0, len(app.state.Collectors))
	for _, collector := range app.state.Collectors {
		copyCollector := *collector
		collectors = append(collectors, &copyCollector)
	}

	return statusResponse{
		Online:               true,
		Service:              "mcips-go-agent",
		BackendReachable:     app.state.BackendReachable,
		QueueDepth:           app.queueDepth(),
		LastEventForwardedAt: app.state.LastEventForwardedAt,
		LastActionExecutedAt: app.state.LastActionExecutedAt,
		LastActionArtifact:   app.state.LastActionArtifact,
		Collectors:           collectors,
		Message:              app.state.LastActionMessage,
	}
}

func (app *agentApp) routes() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/agent/health", func(writer http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(writer).Encode(map[string]any{
			"status":      "ok",
			"service":     "mcips-go-agent",
			"backend_url": app.cfg.BackendEventsURL,
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	mux.HandleFunc("/agent/status", withAgentAuth(func(writer http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(writer).Encode(app.buildStatus())
	}, app.cfg.AgentToken))

	mux.HandleFunc("/agent/events", withAgentAuth(func(writer http.ResponseWriter, request *http.Request) {
		defer request.Body.Close()
		request.Body = http.MaxBytesReader(writer, request.Body, 256*1024)
		var payload map[string]any
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
			http.Error(writer, "invalid event payload", http.StatusBadRequest)
			return
		}

		app.enqueueEvent(payload)
		writer.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(writer).Encode(map[string]any{
			"accepted": true,
			"message":  "event queued for backend forwarding",
			"queueDepth": app.queueDepth(),
		})
	}, app.cfg.AgentToken))

	mux.HandleFunc("/agent/actions", withAgentAuth(func(writer http.ResponseWriter, request *http.Request) {
		defer request.Body.Close()
		request.Body = http.MaxBytesReader(writer, request.Body, 256*1024)
		var command actionCommand
		if err := json.NewDecoder(request.Body).Decode(&command); err != nil {
			http.Error(writer, "invalid action payload", http.StatusBadRequest)
			return
		}

		result, err := app.executeAction(command)
		if err != nil {
			http.Error(writer, err.Error(), http.StatusForbidden)
			return
		}

		_ = json.NewEncoder(writer).Encode(result)
	}, app.cfg.AgentToken))

	return mux
}

func main() {
	cfg := loadConfig()
	app := newAgentApp(cfg)

	if err := app.ensureRuntimePaths(); err != nil {
		log.Fatalf("failed to prepare runtime paths: %v", err)
	}

	go app.runSMSCollector()
	go app.runAuthCollector()
	go app.runForwarder()

	log.Printf("mcips go agent listening on %s", cfg.Addr)
	log.Printf("watching sms inbox: %s", cfg.SMSInboxPath)
	log.Printf("watching auth log: %s", cfg.AuthLogPath)
	log.Fatal(http.ListenAndServe(cfg.Addr, app.routes()))
}
