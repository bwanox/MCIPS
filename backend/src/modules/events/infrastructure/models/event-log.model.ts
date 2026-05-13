import mongoose, { Schema } from "mongoose";

const eventLogSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    source: { type: String, required: true },
    label: { type: String, required: true },
    risk: { type: String, required: true },
    sanitizedPreview: { type: String, required: true },
    piiDetected: { type: Boolean, required: true },
    detectedBank: { type: String },
    fallbackUsed: { type: Boolean, required: true },
    timestamp: { type: String, required: true }
  },
  {
    versionKey: false
  }
);

export const EventLogModel =
  mongoose.models.EventLog ?? mongoose.model("EventLog", eventLogSchema, "event_logs");
