import { prisma } from "@/lib/db/prisma";
import {
  resolveVlInvitationRow,
  type VlInvitationResolvedRow,
} from "@/lib/admin/vl-onboarding/resolve-vl-invitation-rows";
import { buildVereinsentwicklungAccessRows } from "@/lib/admin/people-access/vereinsentwicklung-access-presentation";
import { getEffectivePermissionKeysFromRoleIds } from "@/lib/roles/effective-access-summary";
import type { VereinsentwicklungAccessRow } from "@/lib/admin/people-access/vereinsentwicklung-access-presentation";

export type VlStandardInviteResolvePresentation = {
  resolved: VlInvitationResolvedRow;
  existingVereinsentwicklungPreview: VereinsentwicklungAccessRow[] | null;
  addedVlVereinsentwicklungPreview: VereinsentwicklungAccessRow[] | null;
};

async function buildExistingPreview(
  tenantId: string,
  userId: string,
): Promise<VereinsentwicklungAccessRow[]> {
  const roleIds = (
    await prisma.userRole.findMany({
      where: { userId, tenantId },
      select: { roleId: true },
    })
  ).map((r) => r.roleId);
  const preview = await getEffectivePermissionKeysFromRoleIds(tenantId, roleIds);
  return buildVereinsentwicklungAccessRows(new Set(preview.keys));
}

export async function resolveVlStandardInvitePresentation(
  tenantId: string,
  email: string,
): Promise<VlStandardInviteResolvePresentation> {
  const resolved = await resolveVlInvitationRow(tenantId, email);

  if (
    resolved.action === "UPDATE_ACCESS" &&
    resolved.userId &&
    resolved.vereinsentwicklungPreview
  ) {
    const existingVereinsentwicklungPreview = await buildExistingPreview(tenantId, resolved.userId);
    return {
      resolved,
      existingVereinsentwicklungPreview,
      addedVlVereinsentwicklungPreview: resolved.vereinsentwicklungPreview,
    };
  }

  if (resolved.action === "EXISTING_ACCESS" && resolved.userId) {
    return {
      resolved,
      existingVereinsentwicklungPreview: await buildExistingPreview(tenantId, resolved.userId),
      addedVlVereinsentwicklungPreview: null,
    };
  }

  return {
    resolved,
    existingVereinsentwicklungPreview: null,
    addedVlVereinsentwicklungPreview: resolved.vereinsentwicklungPreview ?? null,
  };
}