/**
 * WORKSPACE-02 — API/session helper: tenant capability + workspace actor context.
 */

import type { Session } from "next-auth";

import type { PermissionKey } from "@/lib/permissions/permissions";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { resolveWorkspaceActor } from "@/lib/workspace/access/actor-context";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";

export type WorkspaceApiActorResult =
  | {
      ok: true;
      session: Session;
      actor: WorkspaceActorContext;
      tenantId: string;
      actorUserId: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      session: Session | null;
    };

export async function requireWorkspaceApiActor(
  permissionKey: PermissionKey,
): Promise<WorkspaceApiActorResult> {
  const access = await requireApiPermission(permissionKey);

  if (!access.ok) {
    return {
      ok: false,
      status: access.status,
      error: access.error,
      session: access.session,
    };
  }

  const tenantId = access.session.user?.activeTenantId;
  const actorUserId = access.session.user?.id;

  if (!tenantId || !actorUserId) {
    return {
      ok: false,
      status: 403,
      error: "Authenticated tenant and user are required.",
      session: access.session,
    };
  }

  const effectiveUserId =
    access.session.user?.effectiveUserId ?? actorUserId;
  const effective = await getRequestEffectivePermissions(
    effectiveUserId,
    tenantId,
  );
  const permissionKeys = [...effective.platform, ...effective.tenant];

  const actor = await resolveWorkspaceActor({
    tenantId,
    userId: effectiveUserId,
    permissionKeys,
  });

  return {
    ok: true,
    session: access.session,
    actor,
    tenantId,
    actorUserId: effectiveUserId,
  };
}
