import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { env } from "../../../../shared/config/env.js";
import type {
  CollectorCredential,
  CollectorCredentialRepository
} from "../../domain/collector-credential.repository.js";

export class CollectorAuthService {
  constructor(private readonly repository: CollectorCredentialRepository) {}

  hashKey(key: string): string {
    return createHmac("sha256", env.collectorKeyPepper).update(key).digest("hex");
  }

  async ensureBootstrapCredential(): Promise<void> {
    if (!env.bootstrapCollectorKey || !env.collectorKeyPepper) return;
    await this.createCredential({
      key: env.bootstrapCollectorKey,
      name: "Bootstrap Go agent",
      tenantId: env.bootstrapCollectorTenantId,
      adapter: env.bootstrapCollectorAdapter
    });
  }

  async createCredential(input: {
    key: string;
    name: string;
    tenantId: string;
    adapter: string;
  }): Promise<CollectorCredential> {
    const now = new Date().toISOString();
    return this.repository.create({
      id: randomUUID(),
      name: input.name,
      keyHash: this.hashKey(input.key),
      keyPrefix: input.key.slice(0, 8),
      tenantId: input.tenantId,
      adapter: input.adapter,
      scopes: ["events:write"],
      active: true,
      createdAt: now
    });
  }

  async authenticate(key: string): Promise<CollectorCredential | null> {
    if (!key || !env.collectorKeyPepper) return null;
    const presentedHash = this.hashKey(key);
    const credential = await this.repository.findByKeyHash(presentedHash);
    if (!credential) return null;

    const expected = Buffer.from(credential.keyHash, "hex");
    const presented = Buffer.from(presentedHash, "hex");
    if (expected.length !== presented.length || !timingSafeEqual(expected, presented)) return null;

    await this.repository.touchLastUsed(credential.id, new Date().toISOString());
    return credential;
  }
}
