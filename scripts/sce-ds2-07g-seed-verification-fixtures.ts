/**
 * SCE-DS2-07G — idempotent verification tenant + 11 route fixtures.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  BankReconciliationImportSource,
  BankReconciliationImportStatus,
  LegalEntityStatus,
  LegalEntityType,
  NewsArticleStatus,
  RequirementResolutionStatus,
  RequirementStatus,
  ReviewWorkflowStage,
  RoleScope,
  TenantStatus,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { hashPassword } from "@/lib/auth/password";
import {
  SCE_DS2_07G_VERIFICATION_FIXTURE_IDS,
  SCE_DS2_07G_VERIFICATION_PERSONA_EMAIL,
  SCE_DS2_07G_VERIFICATION_PERSONA_PASSWORD_ENV,
  SCE_DS2_07G_VERIFICATION_TENANT_ID,
  SCE_DS2_07G_VERIFICATION_TENANT_KEY,
  SCE_DS2_07G_VERIFICATION_USER_ID,
  type SceDs207gVerificationFixtureManifest,
} from "@/lib/design-system/sce-ds2-07g-verification-fixture-constants";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";
import { filterTenantClubAdminDelegatablePermissionKeys } from "@/lib/permissions/tenant-club-admin-permission-contract";
import {
  assertSafeVerificationDatabase,
  assertVerificationMutationAuthorized,
  fingerprintVerificationDatabase,
} from "@/lib/test/safe-verification-database";

const MANIFEST_PATH = join(
  process.cwd(),
  "lib/design-system/sce-ds2-07g-verification-fixtures.json",
);

async function ensureClubAdminRole(
  prisma: PrismaClient,
  tenantId: string,
  tenantKey: string,
): Promise<string> {
  const roleKey = getTenantClubAdminRoleKey(tenantKey);
  const role = await prisma.role.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.clubAdminRoleId },
    update: {
      tenantId,
      key: roleKey,
      name: "Verification Club Admin",
      scope: RoleScope.TENANT,
      isArchived: false,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.clubAdminRoleId,
      tenantId,
      key: roleKey,
      name: "Verification Club Admin",
      scope: RoleScope.TENANT,
      isSystem: true,
      isArchived: false,
    },
    select: { id: true },
  });

  const catalog = await prisma.permission.findMany({
    select: { id: true, key: true, scope: true, grantableByAdmin: true },
  });
  const permissionKeys = filterTenantClubAdminDelegatablePermissionKeys(catalog);
  const permissions = catalog.filter((row) => permissionKeys.includes(row.key));
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }
  return role.id;
}

async function main() {
  assertVerificationMutationAuthorized();
  const connectionString = assertSafeVerificationDatabase();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const password = process.env[SCE_DS2_07G_VERIFICATION_PERSONA_PASSWORD_ENV]?.trim();
  if (!password) {
    throw new Error(
      `Refusing seed: set ${SCE_DS2_07G_VERIFICATION_PERSONA_PASSWORD_ENV} for the verification persona password.`,
    );
  }
  const passwordHash = await hashPassword(password);

  await prisma.tenant.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_TENANT_ID },
    update: {
      key: SCE_DS2_07G_VERIFICATION_TENANT_KEY,
      name: "DS2-07G Verification Club",
      status: TenantStatus.ACTIVE,
      countryCode: "CH",
      sportCategory: "FOOTBALL",
      locale: "de-CH",
      timezone: "Europe/Zurich",
      currency: "CHF",
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      key: SCE_DS2_07G_VERIFICATION_TENANT_KEY,
      name: "DS2-07G Verification Club",
      status: TenantStatus.ACTIVE,
      countryCode: "CH",
      sportCategory: "FOOTBALL",
      locale: "de-CH",
      timezone: "Europe/Zurich",
      currency: "CHF",
    },
  });

  const clubAdminRoleId = await ensureClubAdminRole(
    prisma,
    SCE_DS2_07G_VERIFICATION_TENANT_ID,
    SCE_DS2_07G_VERIFICATION_TENANT_KEY,
  );

  await prisma.orgUnit.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.orgUnitId },
    update: { tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID, key: "club", name: "Verification Club" },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.orgUnitId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      key: "club",
      name: "Verification Club",
    },
  });

  await prisma.user.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_USER_ID },
    update: {
      email: SCE_DS2_07G_VERIFICATION_PERSONA_EMAIL,
      firstName: "DS2",
      lastName: "Verification",
      isActive: true,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      passwordHash,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_USER_ID,
      email: SCE_DS2_07G_VERIFICATION_PERSONA_EMAIL,
      firstName: "DS2",
      lastName: "Verification",
      isActive: true,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      passwordHash,
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
        userId: SCE_DS2_07G_VERIFICATION_USER_ID,
      },
    },
    update: { isActive: true },
    create: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      userId: SCE_DS2_07G_VERIFICATION_USER_ID,
      isActive: true,
    },
  });

  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: SCE_DS2_07G_VERIFICATION_USER_ID,
      roleId: clubAdminRoleId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
    },
  });
  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: SCE_DS2_07G_VERIFICATION_USER_ID,
        roleId: clubAdminRoleId,
        tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      },
    });
  }

  await prisma.person.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.personId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      userId: SCE_DS2_07G_VERIFICATION_USER_ID,
      firstName: "Verification",
      lastName: "Actor",
      email: SCE_DS2_07G_VERIFICATION_PERSONA_EMAIL,
      isActive: true,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.personId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      userId: SCE_DS2_07G_VERIFICATION_USER_ID,
      firstName: "Verification",
      lastName: "Actor",
      email: SCE_DS2_07G_VERIFICATION_PERSONA_EMAIL,
      isActive: true,
    },
  });

  await prisma.requirement.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.requirementId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      title: "Verification requirement",
      status: RequirementStatus.ACTIVE,
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.requirementId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      title: "Verification requirement",
      status: RequirementStatus.ACTIVE,
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
  });

  await prisma.requirementRecipient.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.recipientId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      requirementId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.requirementId,
      subjectPersonId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.personId,
      resolutionStatus: RequirementResolutionStatus.OPEN,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.recipientId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      requirementId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.requirementId,
      subjectPersonId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.personId,
      resolutionStatus: RequirementResolutionStatus.OPEN,
    },
  });

  await prisma.platformCommunicationConversation.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.conversationId },
    update: { tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID, contextKind: "ORGANISATION", conversationKind: "ORG_GENERAL" },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.conversationId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      contextKind: "ORGANISATION",
      conversationKind: "ORG_GENERAL",
    },
  });

  await prisma.platformCommunication.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.campaignId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      conversationId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.conversationId,
      kind: "CAMPAIGN",
      status: "DRAFT",
      contextRef: { kind: "ORGANISATION", tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID },
      bodyText: "Verification campaign body",
      audienceSpecJson: {
        composition: "UNION",
        components: [{ structural: { wholeOrganisation: true } }],
      },
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.campaignId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      conversationId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.conversationId,
      kind: "CAMPAIGN",
      status: "DRAFT",
      contextRef: { kind: "ORGANISATION", tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID },
      bodyText: "Verification campaign body",
      audienceSpecJson: {
        composition: "UNION",
        components: [{ structural: { wholeOrganisation: true } }],
      },
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
  });

  await prisma.platformCommunicationTemplate.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.templateId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      name: "Verification template",
      kind: "ANNOUNCEMENT",
      status: "DRAFT",
      bodyText: "Template body",
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.templateId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      name: "Verification template",
      kind: "ANNOUNCEMENT",
      status: "DRAFT",
      bodyText: "Template body",
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
  });

  await prisma.newsArticle.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.newsArticleId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      slug: "ds2-07g-verification-news",
      title: "Verification news article",
      content: "Verification news content",
      status: NewsArticleStatus.DRAFT,
      authorPersonId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.personId,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.newsArticleId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      slug: "ds2-07g-verification-news",
      title: "Verification news article",
      content: "Verification news content",
      status: NewsArticleStatus.DRAFT,
      authorPersonId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.personId,
    },
  });

  await prisma.initiative.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.initiativeId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      slug: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.initiativeSlug,
      title: "Verification initiative",
      reviewStage: ReviewWorkflowStage.PUBLISHED,
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.initiativeId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      slug: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.initiativeSlug,
      title: "Verification initiative",
      reviewStage: ReviewWorkflowStage.PUBLISHED,
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
  });

  await prisma.meeting.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.meetingId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      slug: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.meetingSlug,
      title: "Verification meeting",
      meetingDate: new Date("2026-06-01T18:00:00.000Z"),
      reviewStage: ReviewWorkflowStage.DRAFT,
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.meetingId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      slug: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.meetingSlug,
      title: "Verification meeting",
      meetingDate: new Date("2026-06-01T18:00:00.000Z"),
      reviewStage: ReviewWorkflowStage.DRAFT,
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
  });

  await prisma.target.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.targetId },
    update: {
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      title: "Verification target",
      reviewStage: ReviewWorkflowStage.DRAFT,
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.targetId,
      tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
      title: "Verification target",
      reviewStage: ReviewWorkflowStage.DRAFT,
      createdByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
  });

  await prisma.legalEntity.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.legalEntityId },
    update: {
      key: "ds2-07g-verification-entity",
      displayName: "Verification legal entity",
      legalName: "Verification legal entity",
      entityType: LegalEntityType.ASSOCIATION,
      status: LegalEntityStatus.ACTIVE,
      addressLine1: "Musterstrasse",
      postalCode: "4000",
      city: "Basel",
      countryCode: "CH",
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.legalEntityId,
      key: "ds2-07g-verification-entity",
      displayName: "Verification legal entity",
      legalName: "Verification legal entity",
      entityType: LegalEntityType.ASSOCIATION,
      status: LegalEntityStatus.ACTIVE,
      addressLine1: "Musterstrasse",
      postalCode: "4000",
      city: "Basel",
      countryCode: "CH",
    },
  });

  await prisma.bankReconciliationImport.upsert({
    where: { id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.bankImportId },
    update: {
      key: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.importKey,
      legalEntityId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.legalEntityId,
      source: BankReconciliationImportSource.CAMT054,
      filename: "verification.camt054.xml",
      contentSha256: "sha256-ds2-07g-verification-import",
      status: BankReconciliationImportStatus.COMPLETED,
      transactionCount: 0,
      uploadedByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
    create: {
      id: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.bankImportId,
      key: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.importKey,
      legalEntityId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.legalEntityId,
      source: BankReconciliationImportSource.CAMT054,
      filename: "verification.camt054.xml",
      contentSha256: "sha256-ds2-07g-verification-import",
      status: BankReconciliationImportStatus.COMPLETED,
      transactionCount: 0,
      uploadedByUserId: SCE_DS2_07G_VERIFICATION_USER_ID,
    },
  });

  const manifest: SceDs207gVerificationFixtureManifest = {
    version: "2026-11-11-batch-9",
    seededAt: new Date().toISOString(),
    databaseFingerprint: fingerprintVerificationDatabase(connectionString),
    tenantId: SCE_DS2_07G_VERIFICATION_TENANT_ID,
    tenantKey: SCE_DS2_07G_VERIFICATION_TENANT_KEY,
    verificationPersonaEmailEnv: SCE_DS2_07G_VERIFICATION_PERSONA_PASSWORD_ENV,
    fixtures: {
      requirementId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.requirementId,
      recipientId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.recipientId,
      campaignId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.campaignId,
      templateId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.templateId,
      newsArticleId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.newsArticleId,
      initiativeSlug: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.initiativeSlug,
      meetingSlug: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.meetingSlug,
      targetId: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.targetId,
      importKey: SCE_DS2_07G_VERIFICATION_FIXTURE_IDS.importKey,
    },
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(JSON.stringify({ status: "seeded", manifestPath: MANIFEST_PATH, manifest }, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("[sce-ds2-07g-seed-verification-fixtures] failed", error);
  process.exit(1);
});
