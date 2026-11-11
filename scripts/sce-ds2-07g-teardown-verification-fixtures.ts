/**
 * SCE-DS2-07G — remove verification tenant subtree from disposable DB.
 */
import "dotenv/config";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  SCE_DS2_07G_VERIFICATION_FIXTURE_IDS,
  SCE_DS2_07G_VERIFICATION_TENANT_ID,
  SCE_DS2_07G_VERIFICATION_USER_ID,
} from "@/lib/design-system/sce-ds2-07g-verification-fixture-constants";
import {
  assertSafeVerificationDatabase,
  assertVerificationMutationAuthorized,
} from "@/lib/test/safe-verification-database";

const MANIFEST_PATH = join(
  process.cwd(),
  "lib/design-system/sce-ds2-07g-verification-fixtures.json",
);

async function main() {
  assertVerificationMutationAuthorized();
  const connectionString = assertSafeVerificationDatabase();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const tenantId = SCE_DS2_07G_VERIFICATION_TENANT_ID;

  await prisma.bankReconciliationTransaction.deleteMany({
    where: { importId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.bankImportId },
  });
  await prisma.bankReconciliationImport.deleteMany({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.bankImportId },
  });
  await prisma.legalEntity.deleteMany({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.legalEntityId },
  });

  await prisma.requirementRecipient.deleteMany({ where: { tenantId } });
  await prisma.requirement.deleteMany({ where: { tenantId } });
  await prisma.platformCommunication.deleteMany({ where: { tenantId } });
  await prisma.platformCommunicationTemplate.deleteMany({ where: { tenantId } });
  await prisma.platformCommunicationConversation.deleteMany({ where: { tenantId } });
  await prisma.newsArticle.deleteMany({ where: { tenantId } });
  await prisma.meeting.deleteMany({ where: { tenantId } });
  await prisma.target.deleteMany({ where: { tenantId } });
  await prisma.initiative.deleteMany({ where: { tenantId } });
  await prisma.userRole.deleteMany({ where: { tenantId } });
  await prisma.tenantMembership.deleteMany({ where: { tenantId } });
  await prisma.person.deleteMany({ where: { tenantId } });
  await prisma.orgUnit.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({
    where: { OR: [{ tenantId }, { id: SCE_DS2_07G_VERIFICATION_USER_ID }] },
  });
  await prisma.tenant.delete({ where: { id: tenantId } });

  try {
    unlinkSync(MANIFEST_PATH);
  } catch {
    // manifest may already be absent
  }

  console.log(JSON.stringify({ status: "teardown-complete", tenantId }, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("[sce-ds2-07g-teardown-verification-fixtures] failed", error);
  process.exit(1);
});
