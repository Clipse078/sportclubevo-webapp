/**
 * SCE-NAV-IA-V2-01 — audit-only types for target information architecture.
 * Not wired into live navigation.
 */

import type { PermissionKey } from "@/lib/permissions/permissions";
import type { AppNavigationDomainId } from "@/lib/nav/app-navigation-domains";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

export type NavIaV2TargetL1 =
  | "dashboard"
  | "planung"
  | "kommunikation"
  | "club"
  | "publishing";

/** Platform workspace keeps SCE-VISUAL-03 domain ids until a dedicated programme. */
export type NavIaV2Workspace = "club" | "platform";

export type NavDestinationClassification =
  | "PRIMARY_DESTINATION"
  | "SECONDARY_DESTINATION"
  | "LOCAL_DESTINATION"
  | "UTILITY_DESTINATION"
  | "ADMIN_DESTINATION"
  | "DEVELOPER_ONLY"
  | "HIDDEN_BY_DESIGN";

export type NavVisibilityContract = {
  header: boolean;
  explorer: boolean;
  mobileEligible: boolean;
};

export type CurrentNavInventoryRecord = {
  key: string;
  label: string;
  route: string;
  currentL1: AppNavigationDomainId | null;
  currentL2: string | null;
  currentLocalGroup: string | null;
  icon: SceIconRegistryName | null;
  permissionKeys: PermissionKey[] | undefined;
  roleAudienceNote: string | null;
  visibleInHeader: boolean;
  visibleInExplorer: boolean;
  mobileVisibility: boolean;
  parentKey: string | null;
  owner: "nav-config.ts";
  classification: NavDestinationClassification;
  workspace: NavIaV2Workspace;
};

export type TargetIaRecord = {
  key: string;
  route: string;
  label: string;
  labelV2: string;
  icon: SceIconRegistryName | null;
  targetL1: NavIaV2TargetL1 | AppNavigationDomainId;
  targetL2: string;
  targetLocalGroup: string | null;
  visibility: NavVisibilityContract;
  permissionKeys: PermissionKey[] | undefined;
  classification: NavDestinationClassification;
  workspace: NavIaV2Workspace;
  routePreserved: boolean;
  migrationReason: string;
};

export type OrganisationMigrationRecord = {
  key: string;
  label: string;
  route: string;
  targetL1: NavIaV2TargetL1;
  targetL2: string;
  targetGroup: string;
  reason: string;
  disposition: "MOVE_TO_CLUB" | "MOVE_ELSEWHERE" | "REMOVE_DUPLICATE" | "REVIEW";
};

export type NavigationCompletenessBaseline = {
  authenticatedRoutePatterns: number;
  navDestinations: number;
  visibleDestinations: number;
  reachableDestinations: number;
  orphanedDestinations: string[];
  duplicateDestinations: string[];
  unregisteredAuthenticatedRoutes: string[];
};
