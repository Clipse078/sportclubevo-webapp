import type { ClubMeldung } from "@prisma/client";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export type ClubMeldungAccessContext = {
  actorUserId: string;
  permissionKeys: readonly string[];
  collaboratorUserIds?: readonly string[];
};

export function hasMeldungPermission(
  permissionKeys: readonly string[],
  key: PermissionKey,
): boolean {
  return permissionKeys.includes(key);
}

/** Reporter read: own cases only — never by guessing case number without auth. */
export function canViewMeldungAsReporter(
  meldung: Pick<ClubMeldung, "reporterUserId">,
  actorUserId: string,
  permissionKeys: readonly string[],
): boolean {
  return (
    hasMeldungPermission(permissionKeys, PERMISSIONS.MELDUNGEN_SUBMIT) &&
    meldung.reporterUserId === actorUserId
  );
}

export function canHandleMeldungInternal(
  meldung: Pick<ClubMeldung, "accountableUserId">,
  ctx: ClubMeldungAccessContext,
): boolean {
  if (!hasMeldungPermission(ctx.permissionKeys, PERMISSIONS.MELDUNGEN_HANDLE)) {
    return false;
  }
  if (meldung.accountableUserId === ctx.actorUserId) return true;
  const collaborators = ctx.collaboratorUserIds ?? [];
  return collaborators.includes(ctx.actorUserId);
}

/**
 * Internal read: view_all sees everything; handle sees assigned/collaborator
 * cases plus unassigned queue for triage (not other owners' cases).
 */
export function canViewMeldungInternal(
  meldung: Pick<ClubMeldung, "accountableUserId" | "reporterUserId">,
  ctx: ClubMeldungAccessContext,
): boolean {
  if (hasMeldungPermission(ctx.permissionKeys, PERMISSIONS.MELDUNGEN_VIEW_ALL)) {
    return true;
  }
  if (
    hasMeldungPermission(ctx.permissionKeys, PERMISSIONS.MELDUNGEN_HANDLE) &&
    meldung.accountableUserId == null
  ) {
    return true;
  }
  return canHandleMeldungInternal(meldung, ctx);
}

export function canViewMeldung(
  meldung: Pick<ClubMeldung, "accountableUserId" | "reporterUserId">,
  ctx: ClubMeldungAccessContext,
): boolean {
  return (
    canViewMeldungAsReporter(meldung, ctx.actorUserId, ctx.permissionKeys) ||
    canViewMeldungInternal(meldung, ctx)
  );
}

/**
 * Mutations (assign, status, internal notes) require meldungen.handle plus
 * applicable case scope (assigned, collaborator, or unassigned triage queue).
 * meldungen.view_all grants read-all only — not mutation by itself.
 */
export function canMutateMeldungInternal(
  meldung: Pick<ClubMeldung, "accountableUserId" | "reporterUserId">,
  ctx: ClubMeldungAccessContext,
): boolean {
  if (!hasMeldungPermission(ctx.permissionKeys, PERMISSIONS.MELDUNGEN_HANDLE)) {
    return false;
  }
  if (hasMeldungPermission(ctx.permissionKeys, PERMISSIONS.MELDUNGEN_VIEW_ALL)) {
    return true;
  }
  if (meldung.accountableUserId == null) {
    return true;
  }
  return canHandleMeldungInternal(meldung, ctx);
}

/** Explicit unassigned claim/triage: handle permission, queue visibility, not view_all alone. */
export function canClaimUnassignedMeldung(
  meldung: Pick<ClubMeldung, "accountableUserId">,
  ctx: ClubMeldungAccessContext,
): boolean {
  return (
    hasMeldungPermission(ctx.permissionKeys, PERMISSIONS.MELDUNGEN_HANDLE) &&
    meldung.accountableUserId == null
  );
}

export const MELDUNG_HANDLER_READ_PERMISSIONS = [
  PERMISSIONS.MELDUNGEN_HANDLE,
  PERMISSIONS.MELDUNGEN_VIEW_ALL,
] as const;

export const MELDUNG_REPORTER_PERMISSIONS = [PERMISSIONS.MELDUNGEN_SUBMIT] as const;