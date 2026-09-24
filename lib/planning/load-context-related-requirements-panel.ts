import type { PlanningResourceType } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { listAuthorizedRequirementsForPlanningResource } from "@/lib/planning/requirement-planning-resource-service";
import type { RequirementServiceContext } from "@/lib/requirements/types";
import { canCreateRequirement } from "@/lib/requirements/requirement-authorization";

export type ContextRelatedRequirementsPanelDto = {
  requirements: Awaited<ReturnType<typeof listAuthorizedRequirementsForPlanningResource>>;
  canLink: boolean;
  canViewPanel: boolean;
};

export async function loadContextRelatedRequirementsPanel(
  ctx: RequirementServiceContext,
  resourceType: PlanningResourceType,
  resourceId: string,
): Promise<ContextRelatedRequirementsPanelDto | null> {
  const canViewPanel =
    ctx.permissionKeys.includes(PERMISSIONS.REQUIREMENTS_VIEW) ||
    ctx.permissionKeys.includes(PERMISSIONS.REQUIREMENTS_MANAGE) ||
    ctx.permissionKeys.includes(PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE);

  if (!canViewPanel) {
    return null;
  }

  const requirements = await listAuthorizedRequirementsForPlanningResource(ctx, {
    resourceType,
    resourceId,
  });

  return {
    requirements,
    canLink: canCreateRequirement(ctx),
    canViewPanel: true,
  };
}
