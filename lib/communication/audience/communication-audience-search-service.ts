/**
 * SCE-COMM-EVO-03 — tenant-scoped audience selector search with sender scope enforcement.
 * SCE-SELECTOR-01 — delegates browse/search to canonical SCE list selector sources.
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { discoverSceSelectorItems } from "@/lib/sce/list-selector/discover-selector-items";
import {
  communicationCategoryToSelectorCategory,
  selectorTypeToCommunicationSearchKind,
} from "@/lib/sce/list-selector/communication-bridge";
import type { SceSelectorSourceType } from "@/lib/sce/list-selector/types";

export type CommunicationAudienceDiscoverCategory =
  | "all"
  | "person"
  | "team"
  | "orgUnit"
  | "role"
  | "targetGroup"
  | "external";

export type CommunicationAudienceDiscoverGroup = {
  kind: CommunicationAudienceSearchKind;
  heading: string;
  options: Array<{ id: string; label: string; description?: string | null }>;
};

export type CommunicationAudienceSearchKind =
  | "person"
  | "team"
  | "orgUnit"
  | "role"
  | "targetGroup"
  | "external";

const GROUP_HEADING: Record<CommunicationAudienceSearchKind, string> = {
  person: "Personen",
  team: "Teams",
  orgUnit: "Organisation",
  role: "Rollen",
  targetGroup: "Zielgruppen",
  external: "Externe",
};

function communicationContextKind(
  context: CommunicationContextRef,
): "DIRECT" | "ORGANISATION" {
  return context.kind === "DIRECT" ? "DIRECT" : "ORGANISATION";
}

export async function searchCommunicationAudienceTargets(input: {
  tenantId: string;
  senderUserId: string;
  context: CommunicationContextRef;
  kind: CommunicationAudienceSearchKind;
  query: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    label: string;
    description?: string | null;
  }>
> {
  const selectorType = {
    person: "PERSON",
    team: "TEAM",
    orgUnit: "ORG_UNIT",
    role: "ROLE",
    targetGroup: "TARGET_GROUP",
    external: "EXTERNAL_CONTACT",
  }[input.kind] as SceSelectorSourceType;

  const category =
    input.kind === "orgUnit"
      ? "org_unit"
      : input.kind === "targetGroup"
        ? "target_group"
        : input.kind === "external"
          ? "external_contact"
          : input.kind;

  const groups = await discoverSceSelectorItems({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    enabledTypes: [selectorType],
    category,
    query: input.query,
    limitPerGroup: input.limit,
    communicationContext: communicationContextKind(input.context),
  });

  const group = groups.find((g) => g.type === selectorType);
  return (
    group?.items.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
    })) ?? []
  );
}

export async function discoverCommunicationAudienceTargets(input: {
  tenantId: string;
  senderUserId: string;
  context: CommunicationContextRef;
  query: string;
  category: CommunicationAudienceDiscoverCategory;
  enabledKinds: readonly CommunicationAudienceSearchKind[];
  limitPerGroup?: number;
}): Promise<CommunicationAudienceDiscoverGroup[]> {
  const enabledTypes = input.enabledKinds.map(
    (k) =>
      ({
        person: "PERSON",
        team: "TEAM",
        orgUnit: "ORG_UNIT",
        role: "ROLE",
        targetGroup: "TARGET_GROUP",
        external: "EXTERNAL_CONTACT",
      })[k] as SceSelectorSourceType,
  );

  const selectorGroups = await discoverSceSelectorItems({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    enabledTypes,
    category: communicationCategoryToSelectorCategory(input.category),
    query: input.query,
    limitPerGroup: input.limitPerGroup,
    communicationContext: communicationContextKind(input.context),
  });

  return selectorGroups.map((group) => {
    const kind = selectorTypeToCommunicationSearchKind(group.type);
    return {
      kind,
      heading: group.heading || GROUP_HEADING[kind],
      options: group.items.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
      })),
    };
  });
}

export async function loadCommunicationAudienceLabels(input: {
  tenantId: string;
  orgUnitIds: readonly string[];
  teamIds: readonly string[];
  roleIds: readonly string[];
  targetGroupIds: readonly string[];
  personIds: readonly string[];
}): Promise<{
  orgUnits: Record<string, string>;
  teams: Record<string, string>;
  roles: Record<string, string>;
  targetGroups: Record<string, string>;
  persons: Record<string, string>;
}> {
  const [orgUnits, teams, roles, targetGroups, persons] = await Promise.all([
    input.orgUnitIds.length
      ? prisma.orgUnit.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.orgUnitIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    input.teamIds.length
      ? prisma.team.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.teamIds] } },
          select: { id: true, name: true, shortName: true },
        })
      : Promise.resolve([]),
    input.roleIds.length
      ? prisma.role.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.roleIds] }, scope: "TENANT" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    input.targetGroupIds.length
      ? prisma.targetGroup.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.targetGroupIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    input.personIds.length
      ? prisma.person.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.personIds] } },
          select: { id: true, firstName: true, lastName: true, displayName: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    orgUnits: Object.fromEntries(orgUnits.map((r) => [r.id, r.name])),
    teams: Object.fromEntries(teams.map((r) => [r.id, r.shortName?.trim() || r.name])),
    roles: Object.fromEntries(roles.map((r) => [r.id, r.name])),
    targetGroups: Object.fromEntries(targetGroups.map((r) => [r.id, r.name])),
    persons: Object.fromEntries(
      persons.map((r) => [
        r.id,
        r.displayName?.trim() || `${r.firstName} ${r.lastName}`.trim(),
      ]),
    ),
  };
}
