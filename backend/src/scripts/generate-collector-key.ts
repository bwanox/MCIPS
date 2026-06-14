import { randomBytes } from "node:crypto";

import mongoose from "mongoose";

import { CollectorAuthService } from "../modules/collectors/application/services/collector-auth.service.js";
import { CollectorCredentialMongoRepository } from "../modules/collectors/infrastructure/repositories/collector-credential-mongo.repository.js";
import { env } from "../shared/config/env.js";

const readArg = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
};

const main = async (): Promise<void> => {
  if (!env.collectorKeyPepper) {
    throw new Error("COLLECTOR_KEY_PEPPER is required to generate collector credentials");
  }

  const tenantId = readArg("--tenant") ?? env.bootstrapCollectorTenantId;
  const adapter = readArg("--adapter") ?? "go-agent";
  const name = readArg("--name") ?? `${adapter} collector`;
  const key = readArg("--key") ?? `mcips_col_${randomBytes(32).toString("base64url")}`;

  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5_000 });
  const authService = new CollectorAuthService(new CollectorCredentialMongoRepository());
  const credential = await authService.createCredential({ key, name, tenantId, adapter });
  await mongoose.disconnect();

  console.log(
    JSON.stringify(
      {
        id: credential.id,
        name: credential.name,
        tenantId: credential.tenantId,
        adapter: credential.adapter,
        scopes: credential.scopes,
        keyPrefix: credential.keyPrefix,
        collectorKey: key,
        note: "Store collectorKey now. Only an HMAC hash is persisted."
      },
      null,
      2
    )
  );
};

main().catch(async (error: unknown) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
