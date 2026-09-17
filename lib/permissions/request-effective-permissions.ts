/**
 * SCE-PERF-01 — per-request deduplication for live RBAC resolution.
 * Still evaluates against the DB via EffectivePermissionResolver; only repeats
 * within the same server request are skipped.
 */

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import {
  createEffectivePermissionResolver,
  type EffectivePermissionsResult,
} from "@/lib/permissions/services/effective-permission-resolver";

const tenantCacheKey = (tenantId: string | undefined) => tenantId ?? "__no_tenant__";

export const getRequestEffectivePermissions = cache(
  async (
    userId: string,
    tenantId: string | undefined,
  ): Promise<EffectivePermissionsResult> => {
    const resolver = createEffectivePermissionResolver(prisma);
    return resolver.getEffectivePermissions({ userId, tenantId });
  },
);

/** Stable cache partition key for explicit tenant overrides in permission gates. */
export function requestEffectivePermissionsCacheKey(
  userId: string,
  tenantId: string | undefined,
): [string, string] {
  return [userId, tenantCacheKey(tenantId)];
}
