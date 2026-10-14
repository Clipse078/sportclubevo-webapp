import type { SceActivityCreateMenuProps } from "@/components/sce/activity-create/SceActivityCreateMenu";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { loadSceActivityCreateSurfaceBundle } from "./load-activity-create-surface-bundle.server";
import type { SceActivityCreatePermissions } from "./activity-create-permissions";

type BuildMenuPropsArgs = {
  tenantId: string;
  userId: string;
  timeZone: string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
  permissions: SceActivityCreatePermissions;
  plannerUrlState?: PlanningHubUrlState;
  reconcilePlanningHub?: boolean;
};

/** Server-side bundle for passing into `SceActivityCreateMenu`. */
export async function buildSceActivityCreateMenuProps(
  args: BuildMenuPropsArgs,
): Promise<Pick<
  SceActivityCreateMenuProps,
  | "permissions"
  | "trainingComposer"
  | "matchComposer"
  | "tournamentComposer"
  | "clubEventComposer"
  | "plannerUrlState"
  | "reconcilePlanningHub"
>> {
  const bundle = await loadSceActivityCreateSurfaceBundle(args);
  return {
    permissions: args.permissions,
    ...bundle,
    plannerUrlState: args.plannerUrlState,
    reconcilePlanningHub: args.reconcilePlanningHub ?? false,
  };
}
