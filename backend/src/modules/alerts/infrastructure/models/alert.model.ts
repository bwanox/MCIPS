import mongoose, { Schema } from "mongoose";

const alertSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    incidentId: { type: String, required: true, index: true },
    incidentType: { type: String, required: true },
    correlationDetected: { type: Boolean, required: true },
    incidentSummary: { type: String, required: true },
    recommendedActions: [{ type: String, required: true }],
    correlatedSignals: [{ type: Schema.Types.Mixed, required: true }],
    explainableRisk: { type: Schema.Types.Mixed, required: true },
    eventId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    datasetFamily: { type: String, required: true },
    label: { type: String, required: true },
    risk: { type: String, required: true },
    severity: { type: String, required: true },
    confidence: { type: Number, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    explanation: { type: String, required: true },
    features: [{ type: String, required: true }],
    source: { type: String, required: true },
    sourceFamily: { type: String, required: true },
    sourceAdapter: { type: String, required: true, index: true },
    sourceRef: { type: String, required: true },
    eventHash: { type: String, required: true, index: true },
    occurredAt: { type: String, required: true },
    agentMetadata: { type: Schema.Types.Mixed },
    sanitizedPreview: { type: String, required: true },
    contentLength: { type: Number, required: true },
    piiDetected: { type: Boolean, required: true },
    detectedBank: { type: String },
    payloadSummary: { type: Schema.Types.Mixed, required: true },
    sanitizedPayload: { type: Schema.Types.Mixed, required: true },
    modelUsed: { type: String, required: true },
    modelVersion: { type: String },
    decisionSource: { type: String },
    componentScores: { type: Schema.Types.Mixed },
    evaluationStatus: { type: String },
    fallbackUsed: { type: Boolean, required: true },
    timestamp: { type: String, required: true },
    mitre: [{ type: Schema.Types.Mixed }],
    threatIntel: [{ type: Schema.Types.Mixed }]
  },
  {
    versionKey: false
  }
);

export const AlertModel =
  mongoose.models.Alert ?? mongoose.model("Alert", alertSchema, "alerts");
