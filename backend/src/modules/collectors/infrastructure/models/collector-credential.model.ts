import mongoose, { Schema } from "mongoose";

const collectorCredentialSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    keyPrefix: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    adapter: { type: String, required: true },
    scopes: [{ type: String, required: true }],
    active: { type: Boolean, required: true, default: true },
    createdAt: { type: String, required: true },
    lastUsedAt: { type: String }
  },
  { versionKey: false }
);

export const CollectorCredentialModel =
  mongoose.models.CollectorCredential ??
  mongoose.model("CollectorCredential", collectorCredentialSchema, "collector_credentials");
