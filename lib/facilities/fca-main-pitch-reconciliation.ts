/**
 * FACILITY-INTEGRITY-01A — FCA main-pitch consolidation (tenant fc-allschwil only).
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  FCA_CANONICAL_MAIN_PITCH_CODES,
  FCA_LEGACY_MAIN_PITCH_CODES,
  diagnoseTenantFacilityIntegrity,
} from "@/lib/facilities/facility-integrity-diagnosis";
import {
  buildLegacyToCanonicalResourceIdMap,
  buildReferenceMatrix,
  countActiveMainPitchFacilities,
  FCA_TENANT_KEY,
  inventoryFromFacilities,
  type MainPitchInventory,
  type ReferenceMatrixRow,
} from "@/lib/facilities/fca-main-pitch-consolidation";
import {
  FCA_MAIN_PITCH_LEGACY_TO_CANONICAL,
  isFcaMainPitchLegacyCode,
} from "@/lib/facilities/fca-main-pitch-legacy-codes";

export { FCA_TENANT_KEY };

export type ReconciliationMode = "inventory" | "dry-run" | "execute";

export type ReconciliationPlan = {
  inventory: MainPitchInventory;
  matrix: ReferenceMatrixRow[];
  resourceIdMap: Map<string, string>;
  alreadyConsolidated: boolean;
};

export type ReconciliationStats = {
  allocationsUpdated: number;
  allocationsRemovedAsDuplicate: number;
  eventPitchCodesUpdated: number;
  legacyResourcesArchived: number;
  legacyFacilityArchived: boolean;
};

export type ReconciliationResult = {
  success: boolean;
  plan: ReconciliationPlan | null;
  stats: ReconciliationStats;
  postMatrix: ReferenceMatrixRow[] | null;
  activeMainPitchFacilityCount: number | null;
  errors: string[];
};

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

async function loadTenantFacilities(prisma: PrismaClient, tenantId: string) {
  return prisma.facility.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      resources: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });
}

export async function collectReferenceCounts(
  prisma: PrismaClient,
  tenantId: string,
  resourceByCode: Map<string, { id: string }>,
): Promise<Record<string, Partial<Record<import("@/lib/facilities/fca-main-pitch-consolidation").ReferenceSource, number>>>> {
  const codes = [...FCA_LEGACY_MAIN_PITCH_CODES, ...FCA_CANONICAL_MAIN_PITCH_CODES];
  const counts: Record<string, Partial<Record<string, number>>> = {};

  for (const code of codes) {
    const resource = resourceByCode.get(code);
    if (!resource) {
      counts[code] = {};
      continue;
    }
    const [ta, tsa, tra, tpa, wpa, efa, eventPitch] = await Promise.all([
      prisma.trainingAllocation.count({ where: { facilityResourceId: resource.id } }),
      prisma.trainingSessionAllocation.count({ where: { facilityResourceId: resource.id } }),
      prisma.tournamentResourceAllocation.count({ where: { facilityResourceId: resource.id } }),
      prisma.tournamentParticipantAllocation.count({ where: { facilityResourceId: resource.id } }),
      prisma.weekplannerPlanAllocation.count({ where: { facilityResourceId: resource.id } }),
      prisma.eventFacilityAllocation.count({ where: { facilityResourceId: resource.id } }),
      prisma.event.count({ where: { tenantId, pitchCode: code } }),
    ]);
    counts[code] = {
      TrainingAllocation: ta,
      TrainingSessionAllocation: tsa,
      TournamentResourceAllocation: tra,
      TournamentParticipantAllocation: tpa,
      WeekplannerPlanAllocation: wpa,
      EventFacilityAllocation: efa,
      "Event.pitchCode": eventPitch,
    };
  }

  return counts;
}

export async function buildReconciliationPlan(
  prisma: PrismaClient,
): Promise<{ plan: ReconciliationPlan | null; errors: string[]; matrix: ReferenceMatrixRow[] }> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: FCA_TENANT_KEY },
    select: { id: true, key: true },
  });
  if (!tenant) {
    return { plan: null, errors: [`Tenant not found: ${FCA_TENANT_KEY}`], matrix: [] };
  }

  const facilities = await loadTenantFacilities(prisma, tenant.id);
  const snapshot = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    status: f.status,
    resources: f.resources.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
      status: r.status,
    })),
  }));

  const { inventory, errors } = inventoryFromFacilities(tenant.id, tenant.key, snapshot);
  if (!inventory) {
    const legacyCanonicalFinding = diagnoseTenantFacilityIntegrity(snapshot).some(
      (f) => f.code === "LEGACY_CANONICAL_MAIN_PITCH_PAIR",
    );
    if (!legacyCanonicalFinding && errors.length === 0) {
      return {
        plan: null,
        errors: [],
        matrix: buildReferenceMatrix({}),
      };
    }
    return {
      plan: null,
      errors: errors.map((e) => e.message),
      matrix: [],
    };
  }

  const activeResources = facilities
    .filter((f) => f.status !== "ARCHIVED")
    .flatMap((f) =>
      f.resources
        .filter((r) => r.status !== "ARCHIVED")
        .map((r) => ({ ...r, facilityName: f.name })),
    );
  const resourceByCode = new Map(activeResources.map((r) => [r.code, { id: r.id }]));
  const counts = await collectReferenceCounts(prisma, tenant.id, resourceByCode);
  const matrix = buildReferenceMatrix(counts);
  const resourceIdMap = buildLegacyToCanonicalResourceIdMap(inventory);

  return {
    plan: {
      inventory,
      matrix,
      resourceIdMap,
      alreadyConsolidated: false,
    },
    errors: [],
    matrix,
  };
}

async function repointAllocations(
  tx: Tx,
  legacyResourceId: string,
  targetResourceId: string,
  stats: ReconciliationStats,
): Promise<void> {
  if (legacyResourceId === targetResourceId) return;

  const trainingAllocations = await tx.trainingAllocation.findMany({
    where: { facilityResourceId: legacyResourceId },
    select: { id: true, trainingSeriesId: true },
  });
  for (const row of trainingAllocations) {
    const duplicate = await tx.trainingAllocation.findUnique({
      where: {
        trainingSeriesId_facilityResourceId: {
          trainingSeriesId: row.trainingSeriesId,
          facilityResourceId: targetResourceId,
        },
      },
    });
    if (duplicate) {
      await tx.trainingAllocation.delete({ where: { id: row.id } });
      stats.allocationsRemovedAsDuplicate++;
    } else {
      await tx.trainingAllocation.update({
        where: { id: row.id },
        data: { facilityResourceId: targetResourceId },
      });
      stats.allocationsUpdated++;
    }
  }

  const sessionAllocations = await tx.trainingSessionAllocation.findMany({
    where: { facilityResourceId: legacyResourceId },
    select: { id: true, trainingSessionId: true },
  });
  for (const row of sessionAllocations) {
    const duplicate = await tx.trainingSessionAllocation.findUnique({
      where: {
        trainingSessionId_facilityResourceId: {
          trainingSessionId: row.trainingSessionId,
          facilityResourceId: targetResourceId,
        },
      },
    });
    if (duplicate) {
      await tx.trainingSessionAllocation.delete({ where: { id: row.id } });
      stats.allocationsRemovedAsDuplicate++;
    } else {
      await tx.trainingSessionAllocation.update({
        where: { id: row.id },
        data: { facilityResourceId: targetResourceId },
      });
      stats.allocationsUpdated++;
    }
  }

  const tournamentResources = await tx.tournamentResourceAllocation.findMany({
    where: { facilityResourceId: legacyResourceId },
    select: { id: true, eventId: true },
  });
  for (const row of tournamentResources) {
    const duplicate = await tx.tournamentResourceAllocation.findUnique({
      where: {
        eventId_facilityResourceId: {
          eventId: row.eventId,
          facilityResourceId: targetResourceId,
        },
      },
    });
    if (duplicate) {
      await tx.tournamentResourceAllocation.delete({ where: { id: row.id } });
      stats.allocationsRemovedAsDuplicate++;
    } else {
      await tx.tournamentResourceAllocation.update({
        where: { id: row.id },
        data: { facilityResourceId: targetResourceId },
      });
      stats.allocationsUpdated++;
    }
  }

  const tournamentParticipants = await tx.tournamentParticipantAllocation.findMany({
    where: { facilityResourceId: legacyResourceId },
    select: { id: true, tournamentParticipantId: true },
  });
  for (const row of tournamentParticipants) {
    const duplicate = await tx.tournamentParticipantAllocation.findUnique({
      where: {
        tournamentParticipantId_facilityResourceId: {
          tournamentParticipantId: row.tournamentParticipantId,
          facilityResourceId: targetResourceId,
        },
      },
    });
    if (duplicate) {
      await tx.tournamentParticipantAllocation.delete({ where: { id: row.id } });
      stats.allocationsRemovedAsDuplicate++;
    } else {
      await tx.tournamentParticipantAllocation.update({
        where: { id: row.id },
        data: { facilityResourceId: targetResourceId },
      });
      stats.allocationsUpdated++;
    }
  }

  const eventFacility = await tx.eventFacilityAllocation.findMany({
    where: { facilityResourceId: legacyResourceId },
    select: { id: true, eventId: true },
  });
  for (const row of eventFacility) {
    const duplicate = await tx.eventFacilityAllocation.findUnique({
      where: {
        eventId_facilityResourceId: {
          eventId: row.eventId,
          facilityResourceId: targetResourceId,
        },
      },
    });
    if (duplicate) {
      await tx.eventFacilityAllocation.delete({ where: { id: row.id } });
      stats.allocationsRemovedAsDuplicate++;
    } else {
      await tx.eventFacilityAllocation.update({
        where: { id: row.id },
        data: { facilityResourceId: targetResourceId },
      });
      stats.allocationsUpdated++;
    }
  }

  const weekplanner = await tx.weekplannerPlanAllocation.findMany({
    where: { facilityResourceId: legacyResourceId },
  });
  for (const row of weekplanner) {
    const duplicate = await tx.weekplannerPlanAllocation.findFirst({
      where: {
        weekplannerPlanId: row.weekplannerPlanId,
        activityType: row.activityType,
        activityId: row.activityId,
        allocationGroup: row.allocationGroup,
        participantId: row.participantId,
        facilityResourceId: targetResourceId,
      },
    });
    if (duplicate) {
      await tx.weekplannerPlanAllocation.delete({ where: { id: row.id } });
      stats.allocationsRemovedAsDuplicate++;
    } else {
      await tx.weekplannerPlanAllocation.update({
        where: { id: row.id },
        data: { facilityResourceId: targetResourceId },
      });
      stats.allocationsUpdated++;
    }
  }
}

async function migrateLegacyEventPitchCodes(
  tx: Tx,
  tenantId: string,
  stats: ReconciliationStats,
): Promise<void> {
  for (const legacyCode of FCA_LEGACY_MAIN_PITCH_CODES) {
    if (!isFcaMainPitchLegacyCode(legacyCode)) continue;
    const canonicalCode = FCA_MAIN_PITCH_LEGACY_TO_CANONICAL[legacyCode];
    const result = await tx.event.updateMany({
      where: { tenantId, pitchCode: legacyCode },
      data: { pitchCode: canonicalCode },
    });
    stats.eventPitchCodesUpdated += result.count;
  }
}

async function verifyNoLegacyReferencesRemain(
  tx: Tx,
  tenantId: string,
  legacyResourceIds: string[],
): Promise<string[]> {
  const failures: string[] = [];
  for (const resourceId of legacyResourceIds) {
    const [
      ta,
      tsa,
      tra,
      tpa,
      wpa,
      efa,
    ] = await Promise.all([
      tx.trainingAllocation.count({ where: { facilityResourceId: resourceId } }),
      tx.trainingSessionAllocation.count({ where: { facilityResourceId: resourceId } }),
      tx.tournamentResourceAllocation.count({ where: { facilityResourceId: resourceId } }),
      tx.tournamentParticipantAllocation.count({ where: { facilityResourceId: resourceId } }),
      tx.weekplannerPlanAllocation.count({ where: { facilityResourceId: resourceId } }),
      tx.eventFacilityAllocation.count({ where: { facilityResourceId: resourceId } }),
    ]);
    const total = ta + tsa + tra + tpa + wpa + efa;
    if (total > 0) {
      failures.push(`Legacy resource ${resourceId} still has ${total} FK allocation(s)`);
    }
  }

  for (const legacyCode of FCA_LEGACY_MAIN_PITCH_CODES) {
    const eventCount = await tx.event.count({ where: { tenantId, pitchCode: legacyCode } });
    if (eventCount > 0) {
      failures.push(`Event.pitchCode still has ${eventCount} row(s) with legacy code ${legacyCode}`);
    }
  }

  return failures;
}

export async function executeFcaMainPitchReconciliation(
  prisma: PrismaClient,
  mode: ReconciliationMode,
): Promise<ReconciliationResult> {
  const emptyStats: ReconciliationStats = {
    allocationsUpdated: 0,
    allocationsRemovedAsDuplicate: 0,
    eventPitchCodesUpdated: 0,
    legacyResourcesArchived: 0,
    legacyFacilityArchived: false,
  };

  const { plan, errors, matrix } = await buildReconciliationPlan(prisma);
  if (errors.length > 0) {
    return { success: false, plan, stats: emptyStats, postMatrix: null, activeMainPitchFacilityCount: null, errors };
  }
  if (!plan) {
    return {
      success: true,
      plan: null,
      stats: emptyStats,
      postMatrix: matrix,
      activeMainPitchFacilityCount: null,
      errors: [],
    };
  }

  if (mode === "inventory" || mode === "dry-run") {
    return {
      success: true,
      plan,
      stats: emptyStats,
      postMatrix: null,
      activeMainPitchFacilityCount: null,
      errors: [],
    };
  }

  const stats = { ...emptyStats };
  const legacyResourceIds = plan.inventory.legacyResources.map((r) => r.id);
  const tenantId = plan.inventory.tenantId;

  await prisma.$transaction(
    async (tx) => {
    for (const [legacyId, canonicalId] of plan.resourceIdMap) {
      await repointAllocations(tx, legacyId, canonicalId, stats);
    }

    await migrateLegacyEventPitchCodes(tx, tenantId, stats);

    const verifyFailures = await verifyNoLegacyReferencesRemain(tx, tenantId, legacyResourceIds);
    if (verifyFailures.length > 0) {
      throw new Error(verifyFailures.join("; "));
    }

    for (const legacy of plan.inventory.legacyResources) {
      await tx.facilityResource.update({
        where: { id: legacy.id },
        data: { status: "ARCHIVED" },
      });
      stats.legacyResourcesArchived++;
    }

    await tx.facility.update({
      where: { id: plan.inventory.legacyFacility.id },
      data: { status: "ARCHIVED" },
    });
    stats.legacyFacilityArchived = true;

    await tx.facility.update({
      where: { id: plan.inventory.canonicalFacility.id },
      data: { name: "Hauptplatz" },
    });

    const postFailures = await verifyNoLegacyReferencesRemain(tx, tenantId, legacyResourceIds);
    if (postFailures.length > 0) {
      throw new Error(`Post-archive verification failed: ${postFailures.join("; ")}`);
    }

    const facilities = await tx.facility.findMany({
      where: { tenantId },
      include: { resources: true },
    });
    const snapshot = facilities.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      status: f.status,
      resources: f.resources.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        status: r.status,
      })),
    }));

    const activeMainCount = countActiveMainPitchFacilities(snapshot);
    if (activeMainCount !== 1) {
      throw new Error(
        `Expected exactly one active main-pitch facility after consolidation; found ${activeMainCount}`,
      );
    }

    const findings = diagnoseTenantFacilityIntegrity(snapshot);
    if (findings.some((f) => f.code === "LEGACY_CANONICAL_MAIN_PITCH_PAIR")) {
      throw new Error("LEGACY_CANONICAL_MAIN_PITCH_PAIR still present after consolidation");
    }
  },
    { timeout: 120_000, maxWait: 30_000 },
  );

  const tenant = await prisma.tenant.findUnique({ where: { key: FCA_TENANT_KEY }, select: { id: true } });
  const facilities = tenant ? await loadTenantFacilities(prisma, tenant.id) : [];
  const activeResources = facilities
    .filter((f) => f.status !== "ARCHIVED")
    .flatMap((f) => f.resources.filter((r) => r.status !== "ARCHIVED"));
  const resourceByCode = new Map(activeResources.map((r) => [r.code, { id: r.id }]));
  const postCounts = tenant
    ? await collectReferenceCounts(prisma, tenant.id, resourceByCode)
    : {};
  const postMatrix = buildReferenceMatrix(postCounts);
  const postSnapshot = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    status: f.status,
    resources: f.resources.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
      status: r.status,
    })),
  }));

  return {
    success: true,
    plan,
    stats,
    postMatrix,
    activeMainPitchFacilityCount: countActiveMainPitchFacilities(postSnapshot),
    errors: [],
  };
}
