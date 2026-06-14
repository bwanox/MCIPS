export interface CollectorCredential {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  tenantId: string;
  adapter: string;
  scopes: string[];
  active: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CollectorCredentialRepository {
  create(credential: CollectorCredential): Promise<CollectorCredential>;
  findByKeyHash(keyHash: string): Promise<CollectorCredential | null>;
  touchLastUsed(id: string, timestamp: string): Promise<void>;
}
