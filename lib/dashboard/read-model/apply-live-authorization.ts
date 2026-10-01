import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";
import {
  resolvePersonalActionsModuleCapabilities,
  type PersonalActionsModuleCapabilities,
} from "@/lib/personal-actions/access";
import type { PersonalDashboardReadModelPayloadV1 } from "./types";
import type {
  DashboardPersonalWorkSnapshot,
  PersonalAttentionSnapshot,
} from "@/lib/dashboard/personal-attention/types";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";

function hasPermission(keys: readonly string[], key: PermissionKey): boolean {
  return keys.includes(key);
}

function resolveLiveCapabilities(args: {
  tenantId: string;
  userId: string;
  permissionKeys: readonly PermissionKey[];
  scopeHints: PersonalDashboardReadModelPayloadV1["scopeHints"];
}): PersonalActionsModuleCapabilities {
  return resolvePersonalActionsModuleCapabilities({
    tenantId: args.tenantId,
    userId: args.userId,
    permissionKeys: args.permissionKeys,
    participationNavCapable: args.scopeHints.participationNavCapable,
    requirementRecipientCapable: args.scopeHints.requirementRecipientCapable,
  });
}

function programmeVisible(permissionKeys: readonly PermissionKey[]): boolean {
  return (
    hasPermission(permissionKeys, PERMISSIONS.TRAININGS_VIEW) ||
    hasPermission(permissionKeys, PERMISSIONS.FIXTURES_VIEW) ||
    hasPermission(permissionKeys, PERMISSIONS.EVENTS_VIEW) ||
    hasPermission(permissionKeys, PERMISSIONS.MEETINGS_VIEW)
  );
}

export function applyLiveAuthorizationToProjection(args: {
  tenantId: string;
  userId: string;
  permissionKeys: readonly PermissionKey[];
  payload: PersonalDashboardReadModelPayloadV1;
}): {
  programmeItems: PersonalProgrammeItem[];
  programmeSupported: boolean;
  personalWork: DashboardPersonalWorkSnapshot;
} {
  const emptyAttention: PersonalAttentionSnapshot = {
    authorized: false,
    items: [],
    totalCount: 0,
    viewAllHref: null,
  };

  const capabilities = resolveLiveCapabilities({
    tenantId: args.tenantId,
    userId: args.userId,
    permissionKeys: args.permissionKeys,
    scopeHints: args.payload.scopeHints,
  });

  const canShowProgramme =
    args.payload.scopeHints.hasActiveTenantMembership &&
    programmeVisible(args.permissionKeys);

  const programmeItems = canShowProgramme ? args.payload.programme.items : [];
  const programmeSupported = canShowProgramme && args.payload.programme.supported;

  const stored = args.payload.personalWork;

  if (!capabilities.personalInbox) {
    const operationalItems = stored.attentionItems.filter(
      (item) => item.sourceType === "DOMAIN_OPERATIONAL",
    );
    const operationalOnly =
      operationalItems.length > 0
        ? {
            authorized: true,
            items: operationalItems.slice(0, 5),
            totalCount: operationalItems.length,
            viewAllHref: null,
            operationalSourcesDegraded: stored.operationalSourcesDegraded,
          }
        : emptyAttention;

    return {
      programmeItems,
      programmeSupported,
      personalWork: {
        attention: operationalOnly,
        tasks: { authorized: false, count: null, preview: [] },
      },
    };
  }

  return {
    programmeItems,
    programmeSupported,
    personalWork: {
      attention: {
        authorized: true,
        items: stored.attentionItems,
        totalCount: stored.attentionTotalCount,
        viewAllHref: stored.viewAllHref,
        operationalSourcesDegraded: stored.operationalSourcesDegraded,
      },
      tasks: {
        authorized: true,
        count: stored.taskCount,
        preview: stored.taskPreview,
      },
    },
  };
}
