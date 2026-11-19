import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { requireApiTenantContextForSlug } from "@/lib/tenants/active-tenant";
import type { PermissionKey } from "@/lib/permissions/permissions";
import {
  canMutateMeldungInternal,
  canViewMeldung,
  type ClubMeldungAccessContext,
} from "@/lib/club-meldungen/access";
import { getClubMeldungDetail } from "@/lib/club-meldungen/queries";

export type MeldungApiActor = {
  tenantId: string;
  tenantKey: string;
  actorUserId: string;
  permissionKeys: string[];
};

export async function requireMeldungApiActor(
  tenantSlug: string,
  permissionKeys: readonly PermissionKey[],
): Promise<
  | { ok: true; actor: MeldungApiActor }
  | { ok: false; status: number; error: string }
> {
  const tenantResult = await requireApiTenantContextForSlug(tenantSlug);
  if (!tenantResult.ok) {
    return { ok: false, status: tenantResult.status, error: tenantResult.error };
  }

  const session = await auth();
  const actorUserId = session?.user?.effectiveUserId ?? session?.user?.id;
  if (!actorUserId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const resolver = createEffectivePermissionResolver(prisma);
  const { platform, tenant } = await resolver.getEffectivePermissions({
    userId: actorUserId,
    tenantId: tenantResult.tenantId,
  });
  const allKeys = [...platform, ...tenant];
  const allowed = permissionKeys.some((key) => allKeys.includes(key));
  if (!allowed) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return {
    ok: true,
    actor: {
      tenantId: tenantResult.tenantId,
      tenantKey: tenantSlug,
      actorUserId,
      permissionKeys: allKeys,
    },
  };
}

export async function assertMeldungReadable(
  actor: MeldungApiActor,
  meldungId: string,
): Promise<{ ok: true; meldung: NonNullable<Awaited<ReturnType<typeof getClubMeldungDetail>>> } | { ok: false; status: number; error: string }> {
  const meldung = await getClubMeldungDetail(actor.tenantId, meldungId);
  if (!meldung) {
    return { ok: false, status: 404, error: "Not found" };
  }
  const accessCtx: ClubMeldungAccessContext = {
    actorUserId: actor.actorUserId,
    permissionKeys: actor.permissionKeys,
    collaboratorUserIds: meldung.collaborators.map((c) => c.userId),
  };
  if (!canViewMeldung(meldung, accessCtx)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, meldung };
}

export function assertMeldungMutable(
  actor: MeldungApiActor,
  meldung: Parameters<typeof canMutateMeldungInternal>[0] & {
    collaborators?: { userId: string }[];
  },
):
  | { ok: true }
  | { ok: false; status: number; error: string } {
  const accessCtx: ClubMeldungAccessContext = {
    actorUserId: actor.actorUserId,
    permissionKeys: actor.permissionKeys,
    collaboratorUserIds: meldung.collaborators?.map((c) => c.userId),
  };
  if (!canMutateMeldungInternal(meldung, accessCtx)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true };
}