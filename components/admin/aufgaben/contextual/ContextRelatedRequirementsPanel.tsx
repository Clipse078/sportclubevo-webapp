import type { PlanningResourceType } from "@prisma/client";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import { loadContextRelatedRequirementsPanel } from "@/lib/planning/load-context-related-requirements-panel";
import ContextRelatedRequirementsPanelView from "./ContextRelatedRequirementsPanelView";

type Props = {
  resourceType: PlanningResourceType;
  resourceId: string;
  locale?: string;
};

export default async function ContextRelatedRequirementsPanel({
  resourceType,
  resourceId,
  locale = "de-CH",
}: Props) {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return null;

  const panel = await loadContextRelatedRequirementsPanel(ctx, resourceType, resourceId);
  if (!panel) return null;

  return (
    <ContextRelatedRequirementsPanelView
      locale={locale}
      resourceType={resourceType}
      resourceId={resourceId}
      requirements={panel.requirements}
      canLink={panel.canLink}
      canUnlink={panel.canLink}
    />
  );
}
