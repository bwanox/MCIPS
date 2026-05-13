import mongoose, { Schema } from "mongoose";

const alertSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
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
    sanitizedPreview: { type: String, required: true },
    contentLength: { type: Number, required: true },
    piiDetected: { type: Boolean, required: true },
    detectedBank: { type: String },
    payloadSummary: { type: Schema.Types.Mixed, required: true },
    sanitizedPayload: { type: Schema.Types.Mixed, required: true },
    modelUsed: { type: String, required: true },
    fallbackUsed: { type: Boolean, required: true },
    timestamp: { type: String, required: true }
  },
  {
    versionKey: false
  }
);

export const AlertModel =
  mongoose.models.Alert ?? mongoose.model("Alert", alertSchema, "alerts");
