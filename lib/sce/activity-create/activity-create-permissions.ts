import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { Session } from "next-auth";
import { hasPermission } from "@/lib/permissions/has-permission";

/** Permission flags for the global "+ Erstellen" menu (page-independent). */
export type SceActivityCreatePermissions = {
  training: boolean;
  match: boolean;
  tournament: boolean;
  veranstaltung: boolean;
};

export function resolveSceActivityCreatePermissionsFromFlags(flags: {
  canManageTrainings: boolean;
  canManageEvents: boolean;
}): SceActivityCreatePermissions {
  return {
    training: flags.canManageTrainings,
    match: flags.canManageEvents,
    tournament: flags.canManageEvents,
    veranstaltung: flags.canManageEvents,
  };
}

/** Resolve canonical create permissions from an authenticated session. */
export function resolveSceActivityCreatePermissions(session: Session): SceActivityCreatePermissions {
  return resolveSceActivityCreatePermissionsFromFlags({
    canManageTrainings: hasPermission(session, PERMISSIONS.TRAININGS_MANAGE),
    canManageEvents: hasPermission(session, PERMISSIONS.EVENTS_MANAGE),
  });
}

export function sceActivityCreatePermissionsHasAny(
  permissions: SceActivityCreatePermissions,
): boolean {
  return (
    permissions.training ||
    permissions.match ||
    permissions.tournament ||
    permissions.veranstaltung
  );
}
