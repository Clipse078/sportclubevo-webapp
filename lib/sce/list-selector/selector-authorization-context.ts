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

export function isSceSelectorAuthorizationContext(
  value: string | null | undefined,
): value is SceSelectorAuthorizationContext {
  return (
    value === "COMMUNICATION_SEND" ||
    value === "TARGET_GROUP_MANAGEMENT"
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
  return [PERMISSIONS.COMMUNICATION_CLUB_SEND, PERMISSIONS.COMMUNICATION_CLUB_VIEW];
}

export function allowedSourceTypesForSelectorAuthorizationContext(
  context: SceSelectorAuthorizationContext,
): readonly SceSelectorSourceType[] {
  if (context === "TARGET_GROUP_MANAGEMENT") {
    return TARGET_GROUP_MANAGEMENT_SOURCES;
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
