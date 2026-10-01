import { redirect } from "next/navigation";
import { getRequestAuthSession } from "@/lib/auth/get-request-auth-session";
import { prisma } from "@/lib/db/prisma";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { resolveWorkspaceContextFromSessionUser } from "@/lib/workspace/workspace-context";

/**
 * Server-rendered gate for privileged platform operations (non-impersonated actor).
 *
 * Mirrors requirePlatformApiPermission() but redirects instead of returning HTTP
 * status codes — use on protected admin/platform pages.
 */
export async function requirePlatformOperatorPermission(permissionKey: PermissionKey) {
  const session = await getRequestAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.isImpersonating) {
    redirect("/dashboard");
  }

  const actorUserId = session.user.actorUserId ?? session.user.id;
  if (!actorUserId || session.user.effectiveUserId !== actorUserId) {
    redirect("/dashboard");
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { isActive: true },
  });
  if (!actor?.isActive) {
    redirect("/dashboard");
  }

  const resolver = createEffectivePermissionResolver(prisma);
  const allowed = await resolver.hasPermission({
    userId: actorUserId,
    permission: permissionKey,
  });

  if (!allowed) {
    redirect("/dashboard");
  }

  return session;
}

/**
 * Server-rendered gate for platform workspace operators (non-impersonated actor).
 *
 * Matches `/dashboard/platform` access: active platform super-admin with no active
 * tenant workspace, plus the same actor/impersonation hygiene as
 * requirePlatformOperatorPermission().
 */
export async function requirePlatformWorkspaceOperator() {
  const session = await getRequestAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.isImpersonating) {
    redirect("/dashboard");
  }

  const actorUserId = session.user.actorUserId ?? session.user.id;
  if (!actorUserId || session.user.effectiveUserId !== actorUserId) {
    redirect("/dashboard");
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { isActive: true },
  });
  if (!actor?.isActive) {
    redirect("/dashboard");
  }

  const workspaceContext = resolveWorkspaceContextFromSessionUser(session.user);
  if (workspaceContext !== "platform") {
    redirect("/dashboard");
  }

  return session;
}
