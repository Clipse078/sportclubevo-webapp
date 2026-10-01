/**
 * SCE-PERF-DASHBOARD-01 — canonical request-scoped dashboard security + personal scope.
 */

import { cache } from "react";
import type { ActorContext } from "@/lib/visibility/actor-context";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { resolvePersonalContext, type PersonalContext } from "@/lib/dashboard/personal-context";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import {
  logSceHotfixLogin01Step,
  logSceHotfixLogin01StepDone,
  recordSceHotfixLogin01DuplicateProbe,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";

export type DashboardContext = {
  tenantId: string;
  userId: string;
  permissionKeys: PermissionKey[];
  orgUnitIds: string[];
  targetGroupIds: string[];
  roleKeys: string[];
  personalContext: PersonalContext;
};

export type ResolveDashboardContextInput = {
  tenantId: string;
  userId: string;
  /** Hydrated actor from getActorContext when available. */
  actor?: Pick<ActorContext, "permissionKeys" | "orgUnitIds" | "targetGroupIds" | "roleKeys"> | null;
};

async function resolveDashboardContextUncached(
  input: ResolveDashboardContextInput,
): Promise<DashboardContext> {
  recordSceHotfixLogin01DuplicateProbe("resolveDashboardContext");
  const trace = sceHotfixLogin01TraceEnabled();
  if (trace) {
    logSceHotfixLogin01Step("dashboard-context");
  }

  let permissionKeys = (input.actor?.permissionKeys ?? []) as PermissionKey[];
  if (permissionKeys.length === 0) {
    const effective = await getRequestEffectivePermissions(input.userId, input.tenantId);
    permissionKeys = [...effective.platform, ...effective.tenant] as PermissionKey[];
  }

  const personalContext = await resolvePersonalContext({
    tenantId: input.tenantId,
    userId: input.userId,
  });

  const ctx: DashboardContext = {
    tenantId: input.tenantId,
    userId: input.userId,
    permissionKeys,
    orgUnitIds: input.actor?.orgUnitIds ?? [],
    targetGroupIds: input.actor?.targetGroupIds ?? [],
    roleKeys: input.actor?.roleKeys ?? [],
    personalContext,
  };

  if (trace) {
    logSceHotfixLogin01StepDone("dashboard-context");
  }
  return ctx;
}

export const resolveDashboardContext = cache(resolveDashboardContextUncached);
