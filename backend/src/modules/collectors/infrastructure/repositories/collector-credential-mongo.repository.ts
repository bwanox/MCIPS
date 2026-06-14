import type {
  CollectorCredential,
  CollectorCredentialRepository
} from "../../domain/collector-credential.repository.js";
import { CollectorCredentialModel } from "../models/collector-credential.model.js";

export class CollectorCredentialMongoRepository implements CollectorCredentialRepository {
  async create(credential: CollectorCredential): Promise<CollectorCredential> {
    const existing = await this.findByKeyHash(credential.keyHash);
    if (existing) return existing;
    await CollectorCredentialModel.create(credential);
    return credential;
  }

  async findByKeyHash(keyHash: string): Promise<CollectorCredential | null> {
    return (await CollectorCredentialModel.findOne({ keyHash, active: true }).lean()) as CollectorCredential | null;
  }

  async touchLastUsed(id: string, timestamp: string): Promise<void> {
    await CollectorCredentialModel.updateOne({ id }, { $set: { lastUsedAt: timestamp } });
  }
}
