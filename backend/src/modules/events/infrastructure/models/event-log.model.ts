import mongoose, { Schema } from "mongoose";

const eventLogSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    alertId: { type: String, required: true, index: true },
    incidentId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    datasetFamily: { type: String, required: true },
    source: { type: String, required: true },
    sourceFamily: { type: String, required: true },
    sourceAdapter: { type: String, required: true, index: true },
    sourceRef: { type: String, required: true, index: true },
    eventHash: { type: String, required: true, index: true },
    occurredAt: { type: String, required: true, index: true },
    agentMetadata: { type: Schema.Types.Mixed },
    contentLength: { type: Number, required: true },
    label: { type: String, required: true },
    risk: { type: String, required: true },
    sanitizedPreview: { type: String, required: true },
    piiDetected: { type: Boolean, required: true },
    detectedBank: { type: String },
    sanitizedPayload: { type: Schema.Types.Mixed, required: true },
    modelUsed: { type: String, required: true },
    fallbackUsed: { type: Boolean, required: true },
    timestamp: { type: String, required: true }
  },
  {
    versionKey: false
  }
);

export const EventLogModel =
  mongoose.models.EventLog ?? mongoose.model("EventLog", eventLogSchema, "event_logs");
