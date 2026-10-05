/**
 * FACILITY-INTEGRITY-01A — idempotent FCA facility seed helpers (tenant fc-allschwil only).
 */

import type {
  Facility,
  FacilityResourceType,
  FacilityType,
  PrismaClient,
} from "@prisma/client";
import {
  FCA_MAIN_PITCH_CANONICAL_CODES,
  FCA_MAIN_PITCH_LEGACY_CODES,
} from "@/lib/facilities/fca-main-pitch-legacy-codes";

export type FcaFacilitySeedDefinition = {
  name: string;
  type: FacilityType;
  sortOrder: number;
  resources: Array<{
    name: string;
    code: string;
    type: FacilityResourceType;
    sortOrder: number;
  }>;
};

const MAIN_PITCH_ANCHOR_CODES = [
  ...FCA_MAIN_PITCH_CANONICAL_CODES,
  ...FCA_MAIN_PITCH_LEGACY_CODES,
] as const;

function definitionIsMainPitch(def: FcaFacilitySeedDefinition): boolean {
  return def.resources.some((r) =>
    (MAIN_PITCH_ANCHOR_CODES as readonly string[]).includes(r.code),
  );
}

/**
 * Resolves the facility row for seed upsert without creating a duplicate main pitch
 * when legacy HAUPTFELD* and canonical STADION* codes already exist on different rows.
 */
export async function resolveFcaFacilityForSeed(
  prisma: PrismaClient,
  tenantId: string,
  facilityDef: FcaFacilitySeedDefinition,
): Promise<Facility> {
  if (definitionIsMainPitch(facilityDef)) {
    for (const code of FCA_MAIN_PITCH_CANONICAL_CODES) {
      const anchor = await prisma.facilityResource.findUnique({
        where: { tenantId_code: { tenantId, code } },
        select: { facilityId: true },
      });
      if (anchor) {
        return prisma.facility.update({
          where: { id: anchor.facilityId },
          data: {
            name: facilityDef.name,
            type: facilityDef.type,
            sortOrder: facilityDef.sortOrder,
          },
        });
      }
    }

    for (const code of FCA_MAIN_PITCH_LEGACY_CODES) {
      const anchor = await prisma.facilityResource.findUnique({
        where: { tenantId_code: { tenantId, code } },
        select: { facilityId: true },
      });
      if (anchor) {
        return prisma.facility.update({
          where: { id: anchor.facilityId },
          data: {
            name: facilityDef.name,
            type: facilityDef.type,
            sortOrder: facilityDef.sortOrder,
          },
        });
      }
    }
  }

  const existing = await prisma.facility.findFirst({
    where: { tenantId, name: facilityDef.name },
    select: { id: true },
  });

  if (existing) {
    return prisma.facility.update({
      where: { id: existing.id },
      data: { type: facilityDef.type, sortOrder: facilityDef.sortOrder },
    });
  }

  return prisma.facility.create({
    data: {
      tenantId,
      name: facilityDef.name,
      type: facilityDef.type,
      sortOrder: facilityDef.sortOrder,
    },
  });
}

export async function upsertFcaFacilityResourcesForSeed(
  prisma: PrismaClient,
  tenantId: string,
  facilityId: string,
  resources: FcaFacilitySeedDefinition["resources"],
): Promise<void> {
  for (const resourceDef of resources) {
    await prisma.facilityResource.upsert({
      where: { tenantId_code: { tenantId, code: resourceDef.code } },
      update: {
        name: resourceDef.name,
        type: resourceDef.type,
        sortOrder: resourceDef.sortOrder,
        facilityId,
      },
      create: {
        tenantId,
        facilityId,
        name: resourceDef.name,
        code: resourceDef.code,
        type: resourceDef.type,
        sortOrder: resourceDef.sortOrder,
      },
    });
  }
}
