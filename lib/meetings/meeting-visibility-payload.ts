import { VisibilityScope } from "@prisma/client";
import {
  parseMeetingAllowlistInput,
  sanitizeMeetingVisibilityAllowlists,
  validateMeetingRestrictedVisibility,
  type SanitizedMeetingVisibilityAllowlists,
} from "@/lib/meetings/meeting-visibility";
import { getVereinsleitungMeetingCreateDefaults } from "@/lib/meetings/meeting-create-defaults";

export type ResolvedMeetingVisibilityPayload = {
  visibilityScope: VisibilityScope;
  allowlists: SanitizedMeetingVisibilityAllowlists;
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

  const parsedOrgUnitRefs = parseMeetingAllowlistInput(body?.visibleOrgUnitRefs);
  let allowlists: SanitizedMeetingVisibilityAllowlists = sanitizeMeetingVisibilityAllowlists(visibilityScope, {
    visibleOrgUnitRefs: parsedOrgUnitRefs !== undefined ? parsedOrgUnitRefs : defaults.visibleOrgUnitRefs,
    visibleRoleRefs: parseMeetingAllowlistInput(body?.visibleRoleRefs),
    visibleUserRefs: parseMeetingAllowlistInput(body?.visibleUserRefs),
    visibleTargetGroupRefs: parseMeetingAllowlistInput(body?.visibleTargetGroupRefs),
  });

  if (
    visibilityScope === VisibilityScope.RESTRICTED &&
    allowlists.visibleOrgUnitRefs.length === 0 &&
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
    visibleOrgUnitRefs: parseMeetingAllowlistInput(body?.visibleOrgUnitRefs),
    visibleRoleRefs: parseMeetingAllowlistInput(body?.visibleRoleRefs),
    visibleUserRefs: parseMeetingAllowlistInput(body?.visibleUserRefs),
    visibleTargetGroupRefs: parseMeetingAllowlistInput(body?.visibleTargetGroupRefs),
  });

  const validation = validateMeetingRestrictedVisibility(visibilityScope, allowlists);
  if (!validation.ok) return validation;

  return { ok: true, payload: { visibilityScope, allowlists } };
}
