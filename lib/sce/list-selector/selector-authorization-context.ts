import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { ZIELGRUPPEN_MANAGE_ROUTE_PERMISSIONS } from "@/lib/communication/zielgruppen/route-access";
import type { SceSelectorSourceType } from "@/lib/sce/list-selector/types";

/**
 * Closed server-side authorization contexts for SCE list selector discovery.
 * Clients may only pass these enum values — never raw permission keys.
 */
export const SCE_SELECTOR_AUTHORIZATION_CONTEXTS = [
  "COMMUNICATION_SEND",
  "TARGET_GROUP_MANAGEMENT",
  "TASK_ASSIGNMENT",
  "REQUIREMENT_AUDIENCE",
  "WORKSPACE_ACCESS",
  "PEOPLE_ACCESS_ADMIN",
  "CLUB_REFERENCE",
] as const;

export type SceSelectorAuthorizationContext = (typeof SCE_SELECTOR_AUTHORIZATION_CONTEXTS)[number];

export type CommunicationAudienceDiscoverContextParam =
  | "DIRECT"
  | "ORGANISATION"
  | "CAMPAIGN"
  | "TARGET_GROUP_MANAGEMENT";

const COMMUNICATION_SEND_SOURCES: readonly SceSelectorSourceType[] = [
  "ORG_UNIT",
  "TEAM",
  "ROLE",
  "PERSON",
  "EXTERNAL_CONTACT",
  "TARGET_GROUP",
];

const TARGET_GROUP_MANAGEMENT_SOURCES: readonly SceSelectorSourceType[] = [
  "ORG_UNIT",
  "TEAM",
  "ROLE",
  "PERSON",
  "EXTERNAL_CONTACT",
];

const TASK_ASSIGNMENT_SOURCES: readonly SceSelectorSourceType[] = ["PERSON", "ORG_UNIT"];

const REQUIREMENT_AUDIENCE_SOURCES: readonly SceSelectorSourceType[] = ["PERSON"];

const WORKSPACE_ACCESS_SOURCES: readonly SceSelectorSourceType[] = [
  "PERSON",
  "TEAM",
  "ORG_UNIT",
  "ROLE",
];

const PEOPLE_ACCESS_ADMIN_SOURCES: readonly SceSelectorSourceType[] = [
  "PERSON",
  "TEAM",
  "ORG_UNIT",
  "ROLE",
];

const CLUB_REFERENCE_SOURCES: readonly SceSelectorSourceType[] = [
  "PERSON",
  "TEAM",
  "ORG_UNIT",
  "ROLE",
];

export function isSceSelectorAuthorizationContext(
  value: string | null | undefined,
): value is SceSelectorAuthorizationContext {
  return (
    value === "COMMUNICATION_SEND" ||
    value === "TARGET_GROUP_MANAGEMENT" ||
    value === "TASK_ASSIGNMENT" ||
    value === "REQUIREMENT_AUDIENCE" ||
    value === "WORKSPACE_ACCESS" ||
    value === "PEOPLE_ACCESS_ADMIN" ||
    value === "CLUB_REFERENCE"
  );
}

export function parseCommunicationAudienceDiscoverContextParam(
  value: string | null | undefined,
): CommunicationAudienceDiscoverContextParam | null {
  if (
    value === "DIRECT" ||
    value === "ORGANISATION" ||
    value === "CAMPAIGN" ||
    value === "TARGET_GROUP_MANAGEMENT"
  ) {
    return value;
  }
  return null;
}

export function communicationDiscoverParamToAuthorizationContext(
  param: CommunicationAudienceDiscoverContextParam,
): SceSelectorAuthorizationContext | "DIRECT_MESSAGE" {
  if (param === "TARGET_GROUP_MANAGEMENT") return "TARGET_GROUP_MANAGEMENT";
  if (param === "DIRECT") return "DIRECT_MESSAGE";
  return "COMMUNICATION_SEND";
}

export function routePermissionsForSelectorAuthorizationContext(
  context: SceSelectorAuthorizationContext | "DIRECT_MESSAGE",
): PermissionKey[] {
  if (context === "DIRECT_MESSAGE") {
    return [...DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS];
  }
  if (context === "TARGET_GROUP_MANAGEMENT") {
    return [...ZIELGRUPPEN_MANAGE_ROUTE_PERMISSIONS];
  }
  if (context === "TASK_ASSIGNMENT") {
    return [PERMISSIONS.TASKS_ASSIGN, PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_CREATE];
  }
  if (context === "REQUIREMENT_AUDIENCE") {
    return [
      PERMISSIONS.REQUIREMENTS_CREATE,
      PERMISSIONS.REQUIREMENTS_MANAGE,
      PERMISSIONS.REQUIREMENTS_VIEW,
    ];
  }
  if (context === "WORKSPACE_ACCESS") {
    return [PERMISSIONS.WORKSPACE_MANAGE];
  }
  if (context === "PEOPLE_ACCESS_ADMIN") {
    return [
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
      PERMISSIONS.USERS_INVITE,
      PERMISSIONS.USERS_MANAGE,
    ];
  }
  if (context === "CLUB_REFERENCE") {
    return [PERMISSIONS.PEOPLE_VIEW, PERMISSIONS.PEOPLE_MANAGE];
  }
  return [PERMISSIONS.COMMUNICATION_CLUB_SEND, PERMISSIONS.COMMUNICATION_CLUB_VIEW];
}

export function allowedSourceTypesForSelectorAuthorizationContext(
  context: SceSelectorAuthorizationContext,
): readonly SceSelectorSourceType[] {
  if (context === "TARGET_GROUP_MANAGEMENT") {
    return TARGET_GROUP_MANAGEMENT_SOURCES;
  }
  if (context === "TASK_ASSIGNMENT") {
    return TASK_ASSIGNMENT_SOURCES;
  }
  if (context === "REQUIREMENT_AUDIENCE") {
    return REQUIREMENT_AUDIENCE_SOURCES;
  }
  if (context === "WORKSPACE_ACCESS") {
    return WORKSPACE_ACCESS_SOURCES;
  }
  if (context === "PEOPLE_ACCESS_ADMIN") {
    return PEOPLE_ACCESS_ADMIN_SOURCES;
  }
  if (context === "CLUB_REFERENCE") {
    return CLUB_REFERENCE_SOURCES;
  }
  return COMMUNICATION_SEND_SOURCES;
}

export function filterSelectorSourceTypesForAuthorizationContext(input: {
  context: SceSelectorAuthorizationContext;
  requested: readonly SceSelectorSourceType[];
}): SceSelectorSourceType[] {
  const allowed = new Set(allowedSourceTypesForSelectorAuthorizationContext(input.context));
  return input.requested.filter((type) => allowed.has(type));
}
