/**
 * FACILITY-INTEGRITY-01 — read-only FCA (fc-allschwil) facility inventory.
 *
 * Usage:
 *   DATABASE_URL=<stage-url> npx tsx scripts/facility-integrity-01-fca-diagnosis.ts
 *
 * No writes. Safe for STAGE diagnosis.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  classifyHauptfeldHauptplatzPair,
  diagnoseTenantFacilityIntegrity,
  FCA_CANONICAL_MAIN_PITCH_CODES,
  FCA_LEGACY_MAIN_PITCH_CODES,
} from "@/lib/facilities/facility-integrity-diagnosis";

const TENANT_KEY = "fc-allschwil";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { key: TENANT_KEY },
      select: { id: true, key: true, name: true },
    });
    if (!tenant) {
      console.error("Tenant not found:", TENANT_KEY);
      process.exit(1);
    }

    const facilities = await prisma.facility.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        resources: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      },
    });

    console.log("=== FCA_FACILITY_INVENTORY ===");
    console.log(JSON.stringify({ tenant }, null, 2));

    for (const facility of facilities) {
      console.log(
        JSON.stringify({
          facility: {
            id: facility.id,
            name: facility.name,
            type: facility.type,
            status: facility.status,
            createdAt: facility.createdAt.toISOString(),
          },
          resources: facility.resources.map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            type: r.type,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
          })),
        }),
      );
    }

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

    const findings = diagnoseTenantFacilityIntegrity(snapshot);
    console.log("=== INTEGRITY_FINDINGS ===");
    console.log(JSON.stringify(findings, null, 2));

    const activeResources = facilities
      .filter((f) => f.status !== "ARCHIVED")
      .flatMap((f) =>
        f.resources
          .filter((r) => r.status !== "ARCHIVED")
          .map((r) => ({ ...r, facilityId: f.id, facilityName: f.name })),
      );

    const legacy = activeResources.filter((r) =>
      (FCA_LEGACY_MAIN_PITCH_CODES as readonly string[]).includes(r.code),
    );
    const canonical = activeResources.filter((r) =>
      (FCA_CANONICAL_MAIN_PITCH_CODES as readonly string[]).includes(r.code),
    );

    const classification = classifyHauptfeldHauptplatzPair({
      legacyMainCodesPresent: legacy.map((r) => r.code),
      canonicalMainCodesPresent: canonical.map((r) => r.code),
      legacyFacilityIds: [...new Set(legacy.map((r) => r.facilityId))],
      canonicalFacilityIds: [...new Set(canonical.map((r) => r.facilityId))],
    });

    console.log("=== HAUPTFELD_HAUPTPLATZ_CLASSIFICATION ===");
    console.log(classification);

    const refCodes = [
      ...FCA_LEGACY_MAIN_PITCH_CODES,
      ...FCA_CANONICAL_MAIN_PITCH_CODES,
      "KUNSTRASEN_2",
      "KUNSTRASEN_2_A",
      "KUNSTRASEN_3",
      "E1",
      "O4",
    ];

    console.log("=== REFERENCE_COUNTS ===");
    for (const code of refCodes) {
      const resource = activeResources.find((r) => r.code === code);
      if (!resource) {
        console.log(JSON.stringify({ code, missing: true }));
        continue;
      }
      const [ta, tsa, tra, tpa, wpa, efa, eventPitch] = await Promise.all([
        prisma.trainingAllocation.count({ where: { facilityResourceId: resource.id } }),
        prisma.trainingSessionAllocation.count({ where: { facilityResourceId: resource.id } }),
        prisma.tournamentResourceAllocation.count({ where: { facilityResourceId: resource.id } }),
        prisma.tournamentParticipantAllocation.count({ where: { facilityResourceId: resource.id } }),
        prisma.weekplannerPlanAllocation.count({ where: { facilityResourceId: resource.id } }),
        prisma.eventFacilityAllocation.count({ where: { facilityResourceId: resource.id } }),
        prisma.event.count({ where: { tenantId: tenant.id, pitchCode: code } }),
      ]);
      console.log(
        JSON.stringify({
          code,
          resourceId: resource.id,
          facilityName: resource.facilityName,
          refs: { ta, tsa, tra, tpa, wpa, efa, eventPitchCode: eventPitch },
        }),
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
