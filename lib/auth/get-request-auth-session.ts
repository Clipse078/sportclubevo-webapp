/**
 * SCE-PERF-02R1 — per-request deduplication for session resolution.
 * JWT/session decode runs once per server render; authorization still uses live RBAC.
 */

import { cache } from "react";
import { auth } from "@/auth";
import { recordSceHotfixLogin01DuplicateProbe } from "@/lib/incident/sce-hotfix-login-01-trace";

export const getRequestAuthSession = cache(async () => {
  recordSceHotfixLogin01DuplicateProbe("getRequestAuthSession");
  return auth();
});
