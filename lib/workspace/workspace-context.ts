import { PLATFORM_SUPERADMIN_ROLE_KEY } from "@/lib/security/platform-superadmin";

export type WorkspaceContext = "platform" | "club";

export type WorkspaceContextInput = {
  activeTenantId: string | null;
  roleKeys: string[];
};

/**
 * Resolves which admin shell workspace the authenticated user is in.
 * Presentation/routing only — not an authorization boundary.
 */
export function resolveWorkspaceContext(
  input: WorkspaceContextInput,
): WorkspaceContext {
  const isPlatformSuperAdmin = input.roleKeys.includes(PLATFORM_SUPERADMIN_ROLE_KEY);

  if (input.activeTenantId === null && isPlatformSuperAdmin) {
    return "platform";
  }

  return "club";
}

export function resolveWorkspaceContextFromSessionUser(
  user: WorkspaceContextInput | null | undefined,
): WorkspaceContext {
  if (!user) return "club";
  return resolveWorkspaceContext({
    activeTenantId: user.activeTenantId,
    roleKeys: user.roleKeys ?? [],
  });
}
