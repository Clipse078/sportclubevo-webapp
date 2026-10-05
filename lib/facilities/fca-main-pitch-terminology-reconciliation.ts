/**
 * FACILITY-INTEGRITY-01A-R2 — idempotent rename of FCA STADION* facility/resource display names.
 * Tenant fc-allschwil only. Preserves ids, codes, and allocation FKs.
 */

import type { PrismaClient } from "@prisma/client";
import {
  FCA_MAIN_PITCH_FACILITY_NAME,
  FCA_MAIN_PITCH_RESOURCE_NAMES,
  shouldRenameFcaMainPitchFacility,
  shouldRenameFcaMainPitchResource,
} from "@/lib/facilities/fca-main-pitch-canonical-terminology";
import { FCA_MAIN_PITCH_CANONICAL_CODES } from "@/lib/facilities/fca-main-pitch-legacy-codes";
import { FCA_TENANT_KEY } from "@/lib/facilities/fca-main-pitch-consolidation";

export type TerminologyReconciliationMode = "inventory" | "dry-run" | "execute";

export type TerminologyTargetRow = {
  kind: "facility" | "resource";
  id: string;
  code?: string;
  fromName: string;
  toName: string;
};

export type TerminologyReconciliationPlan = {
  tenantId: string;
  targets: TerminologyTargetRow[];
  alreadyCanonical: boolean;
};

export type TerminologyReconciliationStats = {
  facilitiesRenamed: number;
  resourcesRenamed: number;
};

export type TerminologyReconciliationResult = {
  success: boolean;
  plan: TerminologyReconciliationPlan | null;
  stats: TerminologyReconciliationStats;
  errors: string[];
};

async function loadMainPitchFacilityWithResources(prisma: PrismaClient, tenantId: string) {
  const facilities = await prisma.facility.findMany({
    where: { tenantId, status: { not: "ARCHIVED" }, type: "PITCH" },
    include: {
      resources: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  return facilities.filter((f) =>
    f.resources.some((r) =>
      (FCA_MAIN_PITCH_CANONICAL_CODES as readonly string[]).includes(r.code),
    ),
  );
}

export async function buildFcaMainPitchTerminologyPlan(
  prisma: PrismaClient,
): Promise<{ plan: TerminologyReconciliationPlan | null; errors: string[] }> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: FCA_TENANT_KEY },
    select: { id: true },
  });
  if (!tenant) {
    return { plan: null, errors: [`Tenant not found: ${FCA_TENANT_KEY}`] };
  }

  const pitchFacilities = await loadMainPitchFacilityWithResources(prisma, tenant.id);
  if (pitchFacilities.length === 0) {
    return { plan: null, errors: ["No active PITCH facility with STADION* resources found"] };
  }
  if (pitchFacilities.length > 1) {
    return {
      plan: null,
      errors: [
        `Expected one active main-pitch facility with STADION*; found ${pitchFacilities.length}`,
      ],
    };
  }

  const facility = pitchFacilities[0]!;
  const targets: TerminologyTargetRow[] = [];

  if (shouldRenameFcaMainPitchFacility(facility.name)) {
    targets.push({
      kind: "facility",
      id: facility.id,
      fromName: facility.name,
      toName: FCA_MAIN_PITCH_FACILITY_NAME,
    });
  } else if (facility.name.trim() !== FCA_MAIN_PITCH_FACILITY_NAME) {
    return {
      plan: null,
      errors: [
        `Main-pitch facility name "${facility.name}" is not R1 Hauptplatz and not canonical Hauptfeld — manual review required`,
      ],
    };
  }

  for (const resource of facility.resources) {
    if (!(FCA_MAIN_PITCH_CANONICAL_CODES as readonly string[]).includes(resource.code)) {
      continue;
    }
    const canonicalName =
      FCA_MAIN_PITCH_RESOURCE_NAMES[
        resource.code as (typeof FCA_MAIN_PITCH_CANONICAL_CODES)[number]
      ];
    if (shouldRenameFcaMainPitchResource(resource.code, resource.name)) {
      targets.push({
        kind: "resource",
        id: resource.id,
        code: resource.code,
        fromName: resource.name,
        toName: canonicalName,
      });
    } else if (resource.name.trim() !== canonicalName) {
      return {
        plan: null,
        errors: [
          `Resource ${resource.code} name "${resource.name}" is not R1 legacy and not canonical "${canonicalName}" — manual review required`,
        ],
      };
    }
  }

  return {
    plan: {
      tenantId: tenant.id,
      targets,
      alreadyCanonical: targets.length === 0,
    },
    errors: [],
  };
}

export async function executeFcaMainPitchTerminologyReconciliation(
  prisma: PrismaClient,
  mode: TerminologyReconciliationMode,
): Promise<TerminologyReconciliationResult> {
  const emptyStats: TerminologyReconciliationStats = {
    facilitiesRenamed: 0,
    resourcesRenamed: 0,
  };

  const { plan, errors } = await buildFcaMainPitchTerminologyPlan(prisma);
  if (errors.length > 0) {
    return { success: false, plan, stats: emptyStats, errors };
  }
  if (!plan) {
    return { success: false, plan: null, stats: emptyStats, errors: ["No plan"] };
  }

  if (mode === "inventory" || mode === "dry-run" || plan.alreadyCanonical) {
    return { success: true, plan, stats: emptyStats, errors: [] };
  }

  const stats = { ...emptyStats };

  await prisma.$transaction(async (tx) => {
    for (const target of plan.targets) {
      if (target.kind === "facility") {
        await tx.facility.update({
          where: { id: target.id },
          data: { name: target.toName },
        });
        stats.facilitiesRenamed++;
      } else {
        await tx.facilityResource.update({
          where: { id: target.id },
          data: { name: target.toName },
        });
        stats.resourcesRenamed++;
      }
    }
  });

  return { success: true, plan, stats, errors: [] };
}

/** Shared apply step used after 01A consolidation execute. */
export async function applyFcaMainPitchCanonicalTerminologyInTransaction(
  tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  tenantId: string,
  canonicalFacilityId: string,
): Promise<TerminologyReconciliationStats> {
  const stats: TerminologyReconciliationStats = {
    facilitiesRenamed: 0,
    resourcesRenamed: 0,
  };

  const facility = await tx.facility.findFirst({
    where: { id: canonicalFacilityId, tenantId },
    include: {
      resources: {
        where: { status: { not: "ARCHIVED" } },
      },
    },
  });
  if (!facility) {
    throw new Error(`Canonical main-pitch facility not found: ${canonicalFacilityId}`);
  }

  if (facility.name.trim() !== FCA_MAIN_PITCH_FACILITY_NAME) {
    await tx.facility.update({
      where: { id: facility.id },
      data: { name: FCA_MAIN_PITCH_FACILITY_NAME },
    });
    stats.facilitiesRenamed++;
  }

  for (const resource of facility.resources) {
    if (!(FCA_MAIN_PITCH_CANONICAL_CODES as readonly string[]).includes(resource.code)) {
      continue;
    }
    const canonicalName =
      FCA_MAIN_PITCH_RESOURCE_NAMES[
        resource.code as (typeof FCA_MAIN_PITCH_CANONICAL_CODES)[number]
      ];
    if (resource.name.trim() !== canonicalName) {
      await tx.facilityResource.update({
        where: { id: resource.id },
        data: { name: canonicalName },
      });
      stats.resourcesRenamed++;
    }
  }

  return stats;
}
