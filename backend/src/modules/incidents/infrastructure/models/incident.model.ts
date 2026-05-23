import mongoose, { Schema } from "mongoose";

const incidentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    status: { type: String, required: true, index: true },
    severity: { type: String, required: true },
    triagePriority: { type: String, required: true },
    sourceFamilies: [{ type: String, required: true }],
    firstSeenAt: { type: String, required: true },
    lastSeenAt: { type: String, required: true },
    summary: { type: String, required: true },
    recommendedActions: [{ type: String, required: true }],
    correlatedSignals: [{ type: Schema.Types.Mixed, required: true }],
    timeline: [{ type: Schema.Types.Mixed, required: true }],
    auditTrail: [{ type: Schema.Types.Mixed, required: true }],
    actions: [{ type: Schema.Types.Mixed, required: true }],
    notifications: [{ type: Schema.Types.Mixed, required: true }],
    aiProvenance: { type: Schema.Types.Mixed, required: true },
    latestAlertId: { type: String, required: true },
    latestEventId: { type: String, required: true }
  },
  {
    versionKey: false
  }
);

export const IncidentModel =
  mongoose.models.Incident ?? mongoose.model("Incident", incidentSchema, "incidents");
