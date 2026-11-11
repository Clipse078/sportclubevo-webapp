/**
 * Safer defaults for meetings created in the Vereinsleitung workspace.
 */

import { prisma } from "@/lib/db/prisma";
import { VisibilityScope } from "@prisma/client";

const VEREINSLEITUNG_ORG_UNIT_KEYS = ["vereinsleitung", "club-leadership", "vorstand"] as const;

export type VereinsleitungMeetingCreateDefaults = {
  visibilityScope: typeof VisibilityScope.RESTRICTED;
  visibleOrgUnitRefs: string[];
  vereinsleitungOrgUnitId: string | null;
  vereinsleitungOrgUnitLabel: string | null;
};

export async function resolveVereinsleitungOrgUnit(
  tenantId: string,
): Promise<{ id: string; name: string } | null> {
  const byName = await prisma.orgUnit.findFirst({
    where: {
      tenantId,
      status: "ACTIVE",
      archivedAt: null,
      name: { equals: "Vereinsleitung", mode: "insensitive" },
    },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  if (byName) return byName;

  const byKey = await prisma.orgUnit.findFirst({
    where: {
      tenantId,
      status: "ACTIVE",
      archivedAt: null,
      key: { in: [...VEREINSLEITUNG_ORG_UNIT_KEYS] },
    },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  return byKey;
}

export async function getVereinsleitungMeetingCreateDefaults(
  tenantId: string,
): Promise<VereinsleitungMeetingCreateDefaults> {
  const unit = await resolveVereinsleitungOrgUnit(tenantId);
  return {
    visibilityScope: VisibilityScope.RESTRICTED,
    visibleOrgUnitRefs: unit ? [unit.id] : [],
    vereinsleitungOrgUnitId: unit?.id ?? null,
    vereinsleitungOrgUnitLabel: unit?.name ?? null,
  };
}
