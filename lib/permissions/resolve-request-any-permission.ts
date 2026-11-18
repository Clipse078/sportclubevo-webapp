import { getRequestAuthSession } from "@/lib/auth/get-request-auth-session";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";

type AuthenticatedRequestSession = NonNullable<
  Awaited<ReturnType<typeof getRequestAuthSession>>
>;

export type ResolvedRequestAnyPermission =
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; session: AuthenticatedRequestSession }
  | { kind: "granted"; session: AuthenticatedRequestSession };

/**
 * Live RBAC evaluation for route surfaces without redirecting. Used by embedded
 * Infoboard preview iframes that must render an explicit denial instead of
 * falling back to /dashboard inside the frame.
 */
export async function resolveRequestAnyPermission(
  permissionKeys: PermissionKey[],
  tenantId?: string,
): Promise<ResolvedRequestAnyPermission> {
  const session = await getRequestAuthSession();

  if (!session?.user) {
    return { kind: "unauthenticated" };
  }

  const effectiveUserId = session.user.effectiveUserId ?? session.user.id;
  const effectiveTenantId = tenantId ?? session.user.activeTenantId ?? undefined;

  const { platform, tenant } = await getRequestEffectivePermissions(
    effectiveUserId,
    effectiveTenantId,
  );

  const allowed = permissionKeys.some(
    (key) => platform.includes(key) || tenant.includes(key),
  );

  if (!allowed) {
    return { kind: "forbidden", session };
  }

  return { kind: "granted", session };
}