import type {
  CollectorCredential,
  CollectorCredentialRepository
} from "../../domain/collector-credential.repository.js";

export class CollectorCredentialMemoryRepository implements CollectorCredentialRepository {
  private readonly credentials: CollectorCredential[] = [];

  async create(credential: CollectorCredential): Promise<CollectorCredential> {
    const existing = this.credentials.find((entry) => entry.keyHash === credential.keyHash);
    if (existing) return existing;
    this.credentials.push(credential);
    return credential;
  }

  async findByKeyHash(keyHash: string): Promise<CollectorCredential | null> {
    return this.credentials.find((entry) => entry.keyHash === keyHash && entry.active) ?? null;
  }

  async touchLastUsed(id: string, timestamp: string): Promise<void> {
    const credential = this.credentials.find((entry) => entry.id === id);
    if (credential) credential.lastUsedAt = timestamp;
  }
}
