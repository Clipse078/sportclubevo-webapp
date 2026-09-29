/**
 * SCE-COMM-EVO-03 — tenant-scoped audience selector search with sender scope enforcement.
 */

import { prisma } from "@/lib/db/prisma";
import {
  listDirectMessageRecipientsInScope,
  searchDirectMessageRecipients,
} from "@/lib/communication/direct/direct-recipient-search";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { searchCommunicationExternalContacts } from "@/lib/communication/external-contacts/external-contact-service";

const DEFAULT_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;
const BROWSE_LIMIT = 12;

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

function normalizeTerm(query: string): string {
  return query.trim();
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
  const term = normalizeTerm(input.query);
  if (term.length < MIN_QUERY_LENGTH) return [];

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), 50);

  if (input.kind === "person") {
    const rows = await searchDirectMessageRecipients({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      query: term,
    });
    return rows.slice(0, limit).map((row) => ({
      id: row.personId,
      label: row.displayName,
      description: [...row.teamLabels, ...row.orgUnitLabels].join(" · ") || null,
    }));
  }

  if (input.kind === "external") {
    return searchCommunicationExternalContacts({
      tenantId: input.tenantId,
      query: term,
      limit,
    });
  }

  if (input.kind === "team") {
    const rows = await prisma.team.findMany({
      where: {
        tenantId: input.tenantId,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { shortName: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        shortName: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      description: row.shortName?.trim() || null,
    }));
  }

  if (input.kind === "orgUnit") {
    const rows = await prisma.orgUnit.findMany({
      where: {
        tenantId: input.tenantId,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { key: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      description: row.key,
    }));
  }

  if (input.kind === "role") {
    const rows = await prisma.role.findMany({
      where: {
        tenantId: input.tenantId,
        scope: "TENANT",
        name: { contains: term, mode: "insensitive" },
      },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      description: row.key,
    }));
  }

  const targetGroups = await prisma.targetGroup.findMany({
    where: {
      tenantId: input.tenantId,
      status: { not: "ARCHIVED" },
      name: { contains: term, mode: "insensitive" },
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  return targetGroups.map((row) => ({
    id: row.id,
    label: row.name,
    description: row.description?.trim() || null,
  }));
}

const GROUP_HEADING: Record<CommunicationAudienceSearchKind, string> = {
  person: "Personen",
  team: "Teams",
  orgUnit: "Organisation",
  role: "Rollen",
  targetGroup: "Zielgruppen",
  external: "Externe",
};

function kindsForCategory(
  category: CommunicationAudienceDiscoverCategory,
): CommunicationAudienceSearchKind[] {
  if (category === "all") {
    return ["person", "team", "orgUnit", "role", "targetGroup", "external"];
  }
  if (category === "external") return ["external"];
  return [category];
}

async function browseCommunicationAudienceTargets(input: {
  tenantId: string;
  senderUserId: string;
  context: CommunicationContextRef;
  kind: CommunicationAudienceSearchKind;
  limit?: number;
}): Promise<Array<{ id: string; label: string; description?: string | null }>> {
  const limit = Math.min(Math.max(input.limit ?? BROWSE_LIMIT, 1), 50);

  if (input.kind === "person") {
    if (input.context.kind !== "DIRECT") {
      const rows = await prisma.person.findMany({
        where: { tenantId: input.tenantId, isActive: true },
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        label: row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
        description: row.email?.trim() || null,
      }));
    }
    const rows = await listDirectMessageRecipientsInScope({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      limit,
    });
    return rows.map((row) => ({
      id: row.personId,
      label: row.displayName,
      description: [...row.teamLabels, ...row.orgUnitLabels].join(" · ") || row.email,
    }));
  }

  if (input.kind === "team") {
    const rows = await prisma.team.findMany({
      where: { tenantId: input.tenantId },
      select: { id: true, name: true, shortName: true },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      description: row.shortName?.trim() || null,
    }));
  }

  if (input.kind === "orgUnit") {
    const rows = await prisma.orgUnit.findMany({
      where: { tenantId: input.tenantId },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      description: row.key,
    }));
  }

  if (input.kind === "external") {
    return searchCommunicationExternalContacts({
      tenantId: input.tenantId,
      query: "",
      limit,
    });
  }

  if (input.kind === "role") {
    const rows = await prisma.role.findMany({
      where: { tenantId: input.tenantId, scope: "TENANT" },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      description: row.key,
    }));
  }

  const targetGroups = await prisma.targetGroup.findMany({
    where: {
      tenantId: input.tenantId,
      status: { not: "ARCHIVED" },
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  return targetGroups.map((row) => ({
    id: row.id,
    label: row.name,
    description: row.description?.trim() || null,
  }));
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
  const term = normalizeTerm(input.query);
  const kinds = kindsForCategory(input.category).filter((kind) =>
    input.enabledKinds.includes(kind),
  );
  const limit = Math.min(Math.max(input.limitPerGroup ?? BROWSE_LIMIT, 1), 50);

  const groups: CommunicationAudienceDiscoverGroup[] = [];

  for (const kind of kinds) {
    const options =
      term.length >= MIN_QUERY_LENGTH
        ? await searchCommunicationAudienceTargets({
            tenantId: input.tenantId,
            senderUserId: input.senderUserId,
            context: input.context,
            kind,
            query: term,
            limit,
          })
        : await browseCommunicationAudienceTargets({
            tenantId: input.tenantId,
            senderUserId: input.senderUserId,
            context: input.context,
            kind,
            limit,
          });

    if (options.length > 0) {
      groups.push({
        kind,
        heading: GROUP_HEADING[kind],
        options,
      });
    }
  }

  return groups;
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
