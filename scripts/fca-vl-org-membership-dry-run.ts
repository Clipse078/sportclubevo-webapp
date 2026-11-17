/**
 * FCA STAGE — optional data correction dry-run: OrgUnitMembership mirror for VL PersonAssignment (no writes).
 *
 * When visibility uses visibleOrgUnitRefs but staff only have PersonAssignment (no OrgUnitMembership row),
 * loadOrgUnitIds now includes assignments in application code. This script documents the legacy gap for ops.
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE npx tsx scripts/fca-vl-org-membership-dry-run.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VL_CONFIRMED_ROSTER } from "@/lib/roles/fca-vl-reconciliation-registry";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.STAGE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[fca-vl-org-membership-dry-run] DATABASE_URL required.");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { key: PILOT_TENANT_KEY },
    select: { id: true, key: true },
  });
  if (!tenant) {
    console.log(JSON.stringify({ error: "tenant_not_found" }));
    return;
  }

  const proposals: object[] = [];

  for (const target of FCA_VL_CONFIRMED_ROSTER) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: target.email, mode: "insensitive" } },
      select: { id: true, email: true },
    });
    if (!user) continue;

    const person = await prisma.person.findFirst({
      where: { tenantId: tenant.id, userId: user.id },
      select: { id: true },
    });
    if (!person) continue;

    const assignments = await prisma.personAssignment.findMany({
      where: { tenantId: tenant.id, personId: person.id, status: "ACTIVE" },
      select: { orgUnitId: true, functionKey: true },
    });

    for (const assignment of assignments) {
      const membership = await prisma.orgUnitMembership.findFirst({
        where: {
          tenantId: tenant.id,
          orgUnitId: assignment.orgUnitId,
          OR: [{ userId: user.id }, { personId: person.id }],
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!membership) {
        proposals.push({
          email: user.email,
          userId: user.id,
          personId: person.id,
          orgUnitId: assignment.orgUnitId,
          functionKey: assignment.functionKey,
          proposedAction:
            "INSERT OrgUnitMembership (ACTIVE) mirroring PersonAssignment — optional if application loadOrgUnitIds includes assignments",
          apply: false,
        });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        tenant: tenant.key,
        dryRun: true,
        note: "No mutations. Prefer application fix in loadOrgUnitIds; use this list only for legacy analytics parity.",
        proposals,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });