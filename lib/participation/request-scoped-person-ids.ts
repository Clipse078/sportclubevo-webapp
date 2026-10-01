/**
 * SCE-HOTFIX-LOGIN-01 — request-scoped dedupe for participation person scope.
 * React.cache is per-request only (not cross-tenant / cross-request).
 */

import { cache } from "react";
import { recordSceHotfixLogin01DuplicateProbe } from "@/lib/incident/sce-hotfix-login-01-trace";
import { getAuthorizedPersonIdsForUser } from "./authorization";

export const getAuthorizedPersonIdsForUserInRequest = cache(
  async (tenantId: string, actorUserId: string): Promise<string[]> => {
    recordSceHotfixLogin01DuplicateProbe("getAuthorizedPersonIdsForUserInRequest");
    return getAuthorizedPersonIdsForUser(tenantId, actorUserId);
  },
);
