"use client";

import { useState } from "react";

import type { EventSubmission } from "../../services/events-service";

export const ManualEventForm = ({ onSubmit }: { onSubmit: (payload: EventSubmission) => Promise<void> }) => {
  const [payload, setPayload] = useState<EventSubmission>({
    type: "EMAIL",
    source: "manual",
    content: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof EventSubmission, value: EventSubmission[keyof EventSubmission]) => {
    setPayload((current) => ({ ...current, [field]: value }));
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
            setPayload({ ...payload, content: "", ipAddress: "", country: "", device: "", userAgent: "" });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label>
          Event Type
          <select
            value={payload.type}
            onChange={(event) => handleChange("type", event.target.value as EventSubmission["type"])}
          >
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
            <option value="TEXT">TEXT</option>
            <option value="LOGIN_ATTEMPT">LOGIN_ATTEMPT</option>
          </select>
        </label>
        <label>
          Content
          <textarea
            value={payload.content}
            onChange={(event) => handleChange("content", event.target.value)}
            placeholder="Paste suspicious content here"
            required
          />
        </label>
        {payload.type === "LOGIN_ATTEMPT" ? (
          <>
            <label>
              IP Address
              <input
                value={payload.ipAddress ?? ""}
                onChange={(event) => handleChange("ipAddress", event.target.value)}
              />
            </label>
            <label>
              Country
              <input value={payload.country ?? ""} onChange={(event) => handleChange("country", event.target.value)} />
            </label>
            <label>
              Device
              <input value={payload.device ?? ""} onChange={(event) => handleChange("device", event.target.value)} />
            </label>
            <label>
              User Agent
              <input
                value={payload.userAgent ?? ""}
                onChange={(event) => handleChange("userAgent", event.target.value)}
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
