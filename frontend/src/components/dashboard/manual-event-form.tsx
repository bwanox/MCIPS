"use client";

import { useState } from "react";

import type { EventSubmission } from "../../services/events-service";
import type { CyberEventType } from "../../types/event";

const eventTypeOptions: Array<{ value: CyberEventType; label: string }> = [
  { value: "sms.message.received", label: "SMS Threat" },
  { value: "auth.login.attempt", label: "Login Attempt" },
  { value: "net.intrusion.suspected", label: "Network Intrusion" },
  { value: "log.anomaly.detected", label: "Log Anomaly" },
  { value: "phishing.email.detected", label: "Phishing Email Features" }
];

const createDefaultPayload = (eventType: CyberEventType): EventSubmission => {
  switch (eventType) {
    case "auth.login.attempt":
      return {
        eventType,
        source: "manual",
        payload: {
          content: "Login attempt detected",
          ip_address: "",
          country: "",
          device: "",
          user_agent: ""
        }
      };
    case "net.intrusion.suspected":
      return {
        eventType,
        source: "manual",
        payload: {
          protocol_type: "tcp",
          service: "http",
          flag: "SF",
          class: "normal",
          difficulty_level: 10,
          src_bytes: 0,
          dst_bytes: 0,
          num_failed_logins: 0,
          root_shell: 0,
          num_compromised: 0,
          serror_rate: 0,
          rerror_rate: 0
        }
      };
    case "log.anomaly.detected":
      return {
        eventType,
        source: "manual",
        payload: {
          log_level: "ERROR",
          component: "auth-service",
          message: "",
          anomaly_score: 0.5,
          is_anomaly: 1
        }
      };
    case "phishing.email.detected":
      return {
        eventType,
        source: "manual",
        payload: {
          label: "Phishing Email",
          label_binary: 1,
          char_count: 0,
          word_count: 0,
          url_count: 0,
          has_html: false,
          ml_score_phishing: 0.5,
          top_tokens: ["verify", "account"]
        }
      };
    case "sms.message.received":
    default:
      return {
        eventType,
        source: "manual",
        payload: {
          content: ""
        }
      };
  }
};

export const ManualEventForm = ({ onSubmit }: { onSubmit: (payload: EventSubmission) => Promise<void> }) => {
  const [payload, setPayload] = useState<EventSubmission>(createDefaultPayload("sms.message.received"));
  const [submitting, setSubmitting] = useState(false);

  const handlePayloadChange = (field: string, value: string | number | boolean | string[]) => {
    setPayload((current) => ({
      ...current,
      payload: {
        ...current.payload,
        [field]: value
      }
    }));
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Manual Submission</h2>
        <span className="badge">Open ingest API</span>
      </div>
      <form
        className="manual-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit(payload);
            setPayload(createDefaultPayload(payload.eventType));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label>
          Event Type
          <select
            value={payload.eventType}
            onChange={(event) => setPayload(createDefaultPayload(event.target.value as CyberEventType))}
          >
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {payload.eventType === "sms.message.received" ? (
          <label>
            Content
            <textarea
              value={String(payload.payload.content ?? "")}
              onChange={(event) => handlePayloadChange("content", event.target.value)}
              placeholder="Paste suspicious SMS content here"
              required
            />
          </label>
        ) : null}
        {payload.eventType === "auth.login.attempt" ? (
          <>
            <label>
              IP Address
              <input
                value={String(payload.payload.ip_address ?? "")}
                onChange={(event) => handlePayloadChange("ip_address", event.target.value)}
              />
            </label>
            <label>
              Country
              <input
                value={String(payload.payload.country ?? "")}
                onChange={(event) => handlePayloadChange("country", event.target.value)}
              />
            </label>
            <label>
              Device
              <input
                value={String(payload.payload.device ?? "")}
                onChange={(event) => handlePayloadChange("device", event.target.value)}
              />
            </label>
            <label>
              User Agent
              <input
                value={String(payload.payload.user_agent ?? "")}
                onChange={(event) => handlePayloadChange("user_agent", event.target.value)}
              />
            </label>
          </>
        ) : null}
        {payload.eventType === "net.intrusion.suspected" ? (
          <>
            <label>
              Protocol
              <input
                value={String(payload.payload.protocol_type ?? "")}
                onChange={(event) => handlePayloadChange("protocol_type", event.target.value)}
              />
            </label>
            <label>
              Service
              <input
                value={String(payload.payload.service ?? "")}
                onChange={(event) => handlePayloadChange("service", event.target.value)}
              />
            </label>
            <label>
              Flag
              <input value={String(payload.payload.flag ?? "")} onChange={(event) => handlePayloadChange("flag", event.target.value)} />
            </label>
            <label>
              Class
              <input value={String(payload.payload.class ?? "")} onChange={(event) => handlePayloadChange("class", event.target.value)} />
            </label>
            <label>
              Difficulty
              <input
                type="number"
                value={Number(payload.payload.difficulty_level ?? 0)}
                onChange={(event) => handlePayloadChange("difficulty_level", Number(event.target.value))}
              />
            </label>
            <label>
              Source Bytes
              <input
                type="number"
                value={Number(payload.payload.src_bytes ?? 0)}
                onChange={(event) => handlePayloadChange("src_bytes", Number(event.target.value))}
              />
            </label>
            <label>
              Destination Bytes
              <input
                type="number"
                value={Number(payload.payload.dst_bytes ?? 0)}
                onChange={(event) => handlePayloadChange("dst_bytes", Number(event.target.value))}
              />
            </label>
            <label>
              Failed Logins
              <input
                type="number"
                value={Number(payload.payload.num_failed_logins ?? 0)}
                onChange={(event) => handlePayloadChange("num_failed_logins", Number(event.target.value))}
              />
            </label>
            <label>
              Root Shell
              <input
                type="number"
                value={Number(payload.payload.root_shell ?? 0)}
                onChange={(event) => handlePayloadChange("root_shell", Number(event.target.value))}
              />
            </label>
            <label>
              Compromised Hosts
              <input
                type="number"
                value={Number(payload.payload.num_compromised ?? 0)}
                onChange={(event) => handlePayloadChange("num_compromised", Number(event.target.value))}
              />
            </label>
            <label>
              SError Rate
              <input
                type="number"
                step="0.01"
                value={Number(payload.payload.serror_rate ?? 0)}
                onChange={(event) => handlePayloadChange("serror_rate", Number(event.target.value))}
              />
            </label>
            <label>
              RError Rate
              <input
                type="number"
                step="0.01"
                value={Number(payload.payload.rerror_rate ?? 0)}
                onChange={(event) => handlePayloadChange("rerror_rate", Number(event.target.value))}
              />
            </label>
          </>
        ) : null}
        {payload.eventType === "log.anomaly.detected" ? (
          <>
            <label>
              Log Level
              <input
                value={String(payload.payload.log_level ?? "")}
                onChange={(event) => handlePayloadChange("log_level", event.target.value)}
              />
            </label>
            <label>
              Component
              <input
                value={String(payload.payload.component ?? "")}
                onChange={(event) => handlePayloadChange("component", event.target.value)}
              />
            </label>
            <label>
              Message
              <textarea
                value={String(payload.payload.message ?? "")}
                onChange={(event) => handlePayloadChange("message", event.target.value)}
                required
              />
            </label>
            <label>
              Anomaly Score
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={Number(payload.payload.anomaly_score ?? 0)}
                onChange={(event) => handlePayloadChange("anomaly_score", Number(event.target.value))}
              />
            </label>
            <label>
              Is Anomaly
              <select
                value={Number(payload.payload.is_anomaly ?? 1)}
                onChange={(event) => handlePayloadChange("is_anomaly", Number(event.target.value))}
              >
                <option value={1}>1</option>
                <option value={0}>0</option>
              </select>
            </label>
          </>
        ) : null}
        {payload.eventType === "phishing.email.detected" ? (
          <>
            <label>
              Label
              <input value={String(payload.payload.label ?? "")} onChange={(event) => handlePayloadChange("label", event.target.value)} />
            </label>
            <label>
              Label Binary
              <select
                value={Number(payload.payload.label_binary ?? 1)}
                onChange={(event) => handlePayloadChange("label_binary", Number(event.target.value))}
              >
                <option value={1}>1</option>
                <option value={0}>0</option>
              </select>
            </label>
            <label>
              Character Count
              <input
                type="number"
                value={Number(payload.payload.char_count ?? 0)}
                onChange={(event) => handlePayloadChange("char_count", Number(event.target.value))}
              />
            </label>
            <label>
              Word Count
              <input
                type="number"
                value={Number(payload.payload.word_count ?? 0)}
                onChange={(event) => handlePayloadChange("word_count", Number(event.target.value))}
              />
            </label>
            <label>
              URL Count
              <input
                type="number"
                value={Number(payload.payload.url_count ?? 0)}
                onChange={(event) => handlePayloadChange("url_count", Number(event.target.value))}
              />
            </label>
            <label>
              Has HTML
              <select
                value={String(Boolean(payload.payload.has_html))}
                onChange={(event) => handlePayloadChange("has_html", event.target.value === "true")}
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </label>
            <label>
              ML Phishing Score
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={Number(payload.payload.ml_score_phishing ?? 0)}
                onChange={(event) => handlePayloadChange("ml_score_phishing", Number(event.target.value))}
              />
            </label>
            <label>
              Top Tokens
              <input
                value={Array.isArray(payload.payload.top_tokens) ? payload.payload.top_tokens.join(", ") : ""}
                onChange={(event) =>
                  handlePayloadChange(
                    "top_tokens",
                    event.target.value
                      .split(",")
                      .map((token) => token.trim())
                      .filter(Boolean)
                  )
                }
              />
            </label>
          </>
        ) : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Analyze Event"}
        </button>
      </form>
    </section>
  );
};
