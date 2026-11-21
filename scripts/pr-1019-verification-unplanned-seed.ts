/**
 * Disposable verification DB — Junioren scope, zero phases, ranked Ungeplant tasks for PR #1019 drag evidence.
 */
import "dotenv/config";
import {
  PrismaClient,
  TaskContextType,
  TaskStatus,
  TaskVisibilityScope,
  TargetCategory,
  TargetPeriod,
  TargetStatus,
  VisibilityScope,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  assertSafeVerificationDatabase,
  assertVerificationMutationAuthorized,
} from "@/lib/test/safe-verification-database";
import {
  SCE_DS2_07G_VERIFICATION_TENANT_ID,
  SCE_DS2_07G_VERIFICATION_USER_ID,
} from "@/lib/design-system/sce-ds2-07g-verification-fixture-constants";

const ORG_ID = "pr-1019-junioren-org";
const PREFIX = "pr-1019-unplanned-";

async function main() {
  process.env.SCE_DS2_07G_VERIFICATION_CONFIRM = "SCE_DS2_07G_ISOLATED_VERIFICATION_MUTATION";
  process.env.SCE_OPERATION_AUTHORIZATION = "sce-ds2-07g-verification:local";
  assertVerificationMutationAuthorized();
  const url = assertSafeVerificationDatabase();
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const tenantId = SCE_DS2_07G_VERIFICATION_TENANT_ID;
  const userId = SCE_DS2_07G_VERIFICATION_USER_ID;
  // Login persona must come from SCE-DS2-07G provision; do not mutate user passwords in verification seeds (SCE-DS-GOV-SECURITY-001).

  await prisma.orgUnit.upsert({
    where: { id: ORG_ID },
    update: { name: "Junioren (PO UAT)", key: "junioren-pr-1019" },
    create: {
      id: ORG_ID,
      tenantId,
      name: "Junioren (PO UAT)",
      key: "junioren-pr-1019",
    },
  });

  const target = await prisma.target.upsert({
    where: { id: `${PREFIX}target` },
    update: { title: "Testziel III (verification)" },
    create: {
      id: `${PREFIX}target`,
      tenantId,
      title: "Testziel III (verification)",
      status: TargetStatus.ACTIVE,
      category: TargetCategory.GOVERNANCE,
      period: TargetPeriod.YEAR,
      createdByUserId: userId,
      visibilityScope: VisibilityScope.ORGANISATION,
    },
  });

  const taskIds: string[] = [];
  for (const label of ["Alpha", "Beta", "Gamma"]) {
    const id = `${PREFIX}task-${label.toLowerCase()}`;
    await prisma.task.upsert({
      where: { id },
      update: { title: `Ungeplant ${label} PO#1019` },
      create: {
        id,
        tenantId,
        title: `Ungeplant ${label} PO#1019`,
        status: TaskStatus.OPEN,
        contextType: TaskContextType.TARGET,
        contextId: target.id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
      },
    });
    taskIds.push(id);
  }

  let rank = 10;
  for (const taskId of taskIds) {
    await prisma.developmentUnplannedTaskRank.upsert({
      where: { taskId },
      update: { rank },
      create: { tenantId, taskId, rank },
    });
    rank += 10;
  }

  console.log(JSON.stringify({ orgUnitId: ORG_ID, targetId: target.id, taskIds }, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});