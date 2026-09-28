/**
 * SCE-COMM-EVO-03 — tenant-scoped audience selector search with sender scope enforcement.
 */

import { prisma } from "@/lib/db/prisma";
import { searchDirectMessageRecipients } from "@/lib/communication/direct/direct-recipient-search";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";

const DEFAULT_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;

export type CommunicationAudienceSearchKind =
  | "person"
  | "team"
  | "orgUnit"
  | "role"
  | "targetGroup";

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
