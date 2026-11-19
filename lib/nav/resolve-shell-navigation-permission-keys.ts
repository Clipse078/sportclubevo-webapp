/**
 * Live permission keys for authenticated shell navigation (header / explorer).
 *
 * Route and API gates evaluate via `getRequestEffectivePermissions`; the JWT
 * snapshot (`session.user.permissionKeys`) can lag behind role grants until the
 * next explicit session refresh. Navigation must use the same live resolver
 * input as destination guards (see RPERM-05 effective-access preview).
 */

import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";

export type ShellNavigationPermissionActor = {
  effectiveUserId: string;
  activeTenantId: string | null;
};

export async function resolveShellNavigationPermissionKeys(
  actor: ShellNavigationPermissionActor,
): Promise<PermissionKey[]> {
  const { platform, tenant } = await getRequestEffectivePermissions(
    actor.effectiveUserId,
    actor.activeTenantId ?? undefined,
  );
  return Array.from(new Set([...platform, ...tenant])).sort() as PermissionKey[];
}