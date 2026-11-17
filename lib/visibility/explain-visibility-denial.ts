/**
 * Diagnostic helper for RESTRICTED / PRIVATE visibility decisions (no side effects).
 * Used by read-only STAGE scripts and regression tests — not for user-facing UI copy.
 */

import { VisibilityScope } from "@prisma/client";
import type { ActorContext } from "./actor-context";
import type { VisibilityCheckable } from "./visibility-filter";
import { canSeeEntity } from "./visibility-filter";

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

export type VisibilityExclusionCode =
  | "visible_organisation"
  | "visible_creator"
  | "visible_private_user_allowlist"
  | "restricted_role_allowlist_match"
  | "restricted_user_allowlist_match"
  | "restricted_org_unit_allowlist_match"
  | "restricted_target_group_allowlist_match"
  | "restricted_no_allowlist_match"
  | "private_not_creator_or_allowlist";

export type VisibilityDenialExplanation = {
  visible: boolean;
  code: VisibilityExclusionCode;
  detail: string;
};

export function explainVisibilityDenial(
  entity: VisibilityCheckable,
  actor: ActorContext,
): VisibilityDenialExplanation {
  if (canSeeEntity(entity, actor)) {
    if (entity.visibilityScope === VisibilityScope.ORGANISATION) {
      return { visible: true, code: "visible_organisation", detail: "ORGANISATION scope" };
    }
    if (entity.createdByUserId && entity.createdByUserId === actor.userId) {
      return { visible: true, code: "visible_creator", detail: "Creator access" };
    }
    if (entity.visibilityScope === VisibilityScope.PRIVATE) {
      return {
        visible: true,
        code: "visible_private_user_allowlist",
        detail: "PRIVATE explicit user allowlist",
      };
    }

    const roleKeys = parseStringArray(entity.visibleRoleRefs);
    if (roleKeys.some((k) => actor.roleKeys.includes(k))) {
      return {
        visible: true,
        code: "restricted_role_allowlist_match",
        detail: "visibleRoleRefs overlap actor.roleKeys",
      };
    }

    const visibleOrgUnitIds = parseStringArray(entity.visibleOrgUnitRefs);
    if (
      visibleOrgUnitIds.length > 0 &&
      visibleOrgUnitIds.some((id) => actor.orgUnitIds.includes(id))
    ) {
      return {
        visible: true,
        code: "restricted_org_unit_allowlist_match",
        detail: "visibleOrgUnitRefs overlap actor.orgUnitIds",
      };
    }

    const userIds = parseStringArray(entity.visibleUserRefs);
    if (userIds.includes(actor.userId)) {
      return {
        visible: true,
        code: "restricted_user_allowlist_match",
        detail: "visibleUserRefs contains actor.userId",
      };
    }

    const visibleTargetGroupIds = parseStringArray(entity.visibleTargetGroupRefs);
    if (
      visibleTargetGroupIds.length > 0 &&
      visibleTargetGroupIds.some((id) => actor.targetGroupIds.includes(id))
    ) {
      return {
        visible: true,
        code: "restricted_target_group_allowlist_match",
        detail: "visibleTargetGroupRefs overlap actor.targetGroupIds",
      };
    }

    return {
      visible: true,
      code: "restricted_role_allowlist_match",
      detail: "Visibility allowlist satisfied",
    };
  }

  if (entity.visibilityScope === VisibilityScope.ORGANISATION) {
    return {
      visible: false,
      code: "restricted_no_allowlist_match",
      detail: "Unexpected deny on ORGANISATION",
    };
  }

  if (entity.visibilityScope === VisibilityScope.PRIVATE) {
    return {
      visible: false,
      code: "private_not_creator_or_allowlist",
      detail: `PRIVATE — actor not creator (${entity.createdByUserId ?? "null"}) and not in visibleUserRefs`,
    };
  }

  const roleKeys = parseStringArray(entity.visibleRoleRefs);
  if (roleKeys.length > 0) {
    return {
      visible: false,
      code: "restricted_no_allowlist_match",
      detail: `RESTRICTED — visibleRoleRefs ${JSON.stringify(roleKeys)} do not intersect actor.roleKeys ${JSON.stringify(actor.roleKeys)}`,
    };
  }

  const visibleOrgUnitIds = parseStringArray(entity.visibleOrgUnitRefs);
  if (visibleOrgUnitIds.length > 0) {
    return {
      visible: false,
      code: "restricted_no_allowlist_match",
      detail: `RESTRICTED — visibleOrgUnitRefs ${JSON.stringify(visibleOrgUnitIds)} do not intersect actor.orgUnitIds ${JSON.stringify(actor.orgUnitIds)}`,
    };
  }

  const userIds = parseStringArray(entity.visibleUserRefs);
  if (userIds.length > 0) {
    return {
      visible: false,
      code: "restricted_no_allowlist_match",
      detail: `RESTRICTED — actor.userId not in visibleUserRefs ${JSON.stringify(userIds)}`,
    };
  }

  return {
    visible: false,
    code: "restricted_no_allowlist_match",
    detail: "RESTRICTED — no configured allowlist dimension matched actor context",
  };
}