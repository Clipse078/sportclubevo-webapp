/**
 * Server-side visibility validation for meetings (RESTRICTED must not be empty-wide).
 */

import { VisibilityScope } from "@prisma/client";

export type MeetingVisibilityAllowlists = {
  visibleOrgUnitRefs?: string[] | null;
  visibleRoleRefs?: string[] | null;
  visibleUserRefs?: string[] | null;
  visibleTargetGroupRefs?: string[] | null;
  visibleTeamRefs?: string[] | null;
  visiblePersonRefs?: string[] | null;
};

/** Allowlists after `sanitizeMeetingVisibilityAllowlists` (always concrete arrays for Prisma JSON). */
export type SanitizedMeetingVisibilityAllowlists = {
  visibleOrgUnitRefs: string[];
  visibleRoleRefs: string[];
  visibleUserRefs: string[];
  visibleTargetGroupRefs: string[];
  visibleTeamRefs: string[];
  visiblePersonRefs: string[];
};

/** Parses allowlist fields from untyped request bodies at API boundaries. */
export function parseMeetingAllowlistInput(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return nonEmptyStringArray(value);
}

function nonEmptyStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
}

export function countMeetingVisibilityAllowlistRefs(refs: MeetingVisibilityAllowlists): number {
  return (
    nonEmptyStringArray(refs.visibleOrgUnitRefs).length +
    nonEmptyStringArray(refs.visibleRoleRefs).length +
    nonEmptyStringArray(refs.visibleUserRefs).length +
    nonEmptyStringArray(refs.visibleTargetGroupRefs).length +
    nonEmptyStringArray(refs.visibleTeamRefs).length +
    nonEmptyStringArray(refs.visiblePersonRefs).length
  );
}

export function validateMeetingRestrictedVisibility(
  scope: VisibilityScope,
  refs: MeetingVisibilityAllowlists,
): { ok: true } | { ok: false; error: string } {
  if (scope !== VisibilityScope.RESTRICTED) return { ok: true };
  if (countMeetingVisibilityAllowlistRefs(refs) === 0) {
    return {
      ok: false,
      error:
        "Bei eingeschränkter Sichtbarkeit muss mindestens eine Org.-Einheit, Rolle, Person oder Zielgruppe ausgewählt werden.",
    };
  }
  return { ok: true };
}

export function sanitizeMeetingVisibilityAllowlists(
  scope: VisibilityScope,
  refs: MeetingVisibilityAllowlists,
): SanitizedMeetingVisibilityAllowlists {
  if (scope !== VisibilityScope.RESTRICTED) {
    return {
      visibleOrgUnitRefs: [],
      visibleRoleRefs: [],
      visibleUserRefs: [],
      visibleTargetGroupRefs: [],
      visibleTeamRefs: [],
      visiblePersonRefs: [],
    };
  }
  return {
    visibleOrgUnitRefs: nonEmptyStringArray(refs.visibleOrgUnitRefs),
    visibleRoleRefs: nonEmptyStringArray(refs.visibleRoleRefs),
    visibleUserRefs: nonEmptyStringArray(refs.visibleUserRefs),
    visibleTargetGroupRefs: nonEmptyStringArray(refs.visibleTargetGroupRefs),
    visibleTeamRefs: nonEmptyStringArray(refs.visibleTeamRefs),
    visiblePersonRefs: nonEmptyStringArray(refs.visiblePersonRefs),
  };
}

/** Prisma JSON columns — string[] only (no null; satisfies InputJsonValue). */
export function meetingAllowlistsForPrisma(allowlists: SanitizedMeetingVisibilityAllowlists) {
  return allowlists;
}
