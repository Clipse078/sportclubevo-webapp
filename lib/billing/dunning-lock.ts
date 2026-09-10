import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

const DUNNING_LOCK_NAMESPACE = 2_401_091;

function tenantIdToAdvisoryLockKey(tenantId: string): number {
  let hash = DUNNING_LOCK_NAMESPACE;
  for (let i = 0; i < tenantId.length; i += 1) {
    hash = (hash * 31 + tenantId.charCodeAt(i)) | 0;
  }
  return hash;
}

export async function withTenantDunningLock<T>(
  tenantId: string,
  worker: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const lockKey = tenantIdToAdvisoryLockKey(tenantId);
    await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock($1)", lockKey);
    return worker(tx);
  });
}
