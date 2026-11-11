import { VisibilityScope } from "@prisma/client";
import {
  sanitizeMeetingVisibilityAllowlists,
  validateMeetingRestrictedVisibility,
  type MeetingVisibilityAllowlists,
} from "@/lib/meetings/meeting-visibility";
import { getVereinsleitungMeetingCreateDefaults } from "@/lib/meetings/meeting-create-defaults";

export type ResolvedMeetingVisibilityPayload = {
  visibilityScope: VisibilityScope;
  allowlists: MeetingVisibilityAllowlists;
};

export async function resolveMeetingVisibilityOnCreate(
  tenantId: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; payload: ResolvedMeetingVisibilityPayload } | { ok: false; error: string }> {
  const validScopes = Object.values(VisibilityScope);
  const requestedScope = validScopes.includes(body?.visibilityScope as VisibilityScope)
    ? (body.visibilityScope as VisibilityScope)
    : null;

  const defaults = await getVereinsleitungMeetingCreateDefaults(tenantId);
  const visibilityScope = requestedScope ?? defaults.visibilityScope;

  let allowlists: MeetingVisibilityAllowlists = sanitizeMeetingVisibilityAllowlists(visibilityScope, {
    visibleOrgUnitRefs: Array.isArray(body?.visibleOrgUnitRefs)
      ? (body.visibleOrgUnitRefs as string[])
      : defaults.visibleOrgUnitRefs,
    visibleRoleRefs: Array.isArray(body?.visibleRoleRefs) ? (body.visibleRoleRefs as string[]) : undefined,
    visibleUserRefs: Array.isArray(body?.visibleUserRefs) ? (body.visibleUserRefs as string[]) : undefined,
    visibleTargetGroupRefs: Array.isArray(body?.visibleTargetGroupRefs)
      ? (body.visibleTargetGroupRefs as string[])
      : undefined,
  });

  if (
    visibilityScope === VisibilityScope.RESTRICTED &&
    (!allowlists.visibleOrgUnitRefs?.length || allowlists.visibleOrgUnitRefs.length === 0) &&
    defaults.visibleOrgUnitRefs.length > 0
  ) {
    allowlists = {
      ...allowlists,
      visibleOrgUnitRefs: defaults.visibleOrgUnitRefs,
    };
  }

  const validation = validateMeetingRestrictedVisibility(visibilityScope, allowlists);
  if (!validation.ok) return validation;

  return { ok: true, payload: { visibilityScope, allowlists } };
}

export async function resolveMeetingVisibilityOnUpdate(
  body: Record<string, unknown>,
  currentScope: VisibilityScope,
): Promise<{ ok: true; payload: Partial<ResolvedMeetingVisibilityPayload> } | { ok: false; error: string }> {
  const validScopes = Object.values(VisibilityScope);
  const visibilityScope = validScopes.includes(body?.visibilityScope as VisibilityScope)
    ? (body.visibilityScope as VisibilityScope)
    : currentScope;

  const allowlists = sanitizeMeetingVisibilityAllowlists(visibilityScope, {
    visibleOrgUnitRefs: Array.isArray(body?.visibleOrgUnitRefs)
      ? (body.visibleOrgUnitRefs as string[])
      : undefined,
    visibleRoleRefs: Array.isArray(body?.visibleRoleRefs) ? (body.visibleRoleRefs as string[]) : undefined,
    visibleUserRefs: Array.isArray(body?.visibleUserRefs) ? (body.visibleUserRefs as string[]) : undefined,
    visibleTargetGroupRefs: Array.isArray(body?.visibleTargetGroupRefs)
      ? (body.visibleTargetGroupRefs as string[])
      : undefined,
  });

  const validation = validateMeetingRestrictedVisibility(visibilityScope, allowlists);
  if (!validation.ok) return validation;

  return { ok: true, payload: { visibilityScope, allowlists } };
}
