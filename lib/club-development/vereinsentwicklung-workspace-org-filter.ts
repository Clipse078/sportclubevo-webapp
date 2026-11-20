import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "./vereinsentwicklung-connected-workspace";

export type VereinsentwicklungOrgEinheitFilter = {
  id: string;
  label: string;
};

export async function resolveVereinsentwicklungOrgEinheitFilter(
  actor: ActorContext,
  rawOrgUnitId: string | undefined | null,
): Promise<VereinsentwicklungOrgEinheitFilter | null> {
  const orgUnitId = rawOrgUnitId?.trim();
  if (!orgUnitId || !actor.tenantId) return null;

  const row = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, tenantId: actor.tenantId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!row) return null;

  if (actor.orgUnitIds.length > 0 && !actor.orgUnitIds.includes(row.id)) {
    return null;
  }

  return { id: row.id, label: row.name };
}

export function parseOrgEinheitQuery(
  search: Record<string, string | undefined> | URLSearchParams,
): string | undefined {
  const read = (key: string): string | undefined => {
    if (search instanceof URLSearchParams) return search.get(key) ?? undefined;
    return search[key];
  };
  return read(CD_WORKSPACE_ORG_UNIT_QUERY)?.trim() || undefined;
}