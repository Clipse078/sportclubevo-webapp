/**
 * Disposable fixture: parent + leaf pages for lifecycle browser regression.
 * Prints JSON: { parentPageId, leafPageId, leafTitle, email, password }
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  PermissionModule,
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationResourceType,
  TenantDocumentationDraftSaveStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import {
  emptyYjsState,
  yjsStateToRichTextSnapshot,
} from "@/lib/tenant-documentation/yjs-document";

const RUN = `tdoc-life-br-${Date.now()}`;
const TENANT_ID = `tenant-${RUN}`;
const EMAIL = `tdoc-life-browser-${RUN}@fixture.local`;
const PASSWORD = process.env.TENANT_DOC_BROWSER_PASSWORD?.trim() || "TenantDocBrowserE2eFixture";
const LEAF_TITLE = "Lifecycle Leaf";

async function ensurePermissions() {
  for (const key of [
    PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
    PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
    PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
    PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
  ]) {
    await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        name: key,
        module: PermissionModule.TENANT_DOCUMENTATION,
        scope: "TENANT",
        grantableByAdmin: true,
      },
      update: {},
    });
  }
}

async function main() {
  assertSafeTestDatabase();
  await ensurePermissions();

  await prisma.tenant.create({
    data: { id: TENANT_ID, key: `key-${RUN}`, name: "Lifecycle Browser E2E" },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      firstName: "Lifecycle",
      lastName: "Manager",
      passwordHash,
      isActive: true,
    },
  });

  await prisma.tenantMembership.create({
    data: { tenantId: TENANT_ID, userId: user.id, isActive: true },
  });

  const role = await prisma.role.create({
    data: {
      tenantId: TENANT_ID,
      scope: "TENANT",
      key: `role_${RUN}`,
      name: "Doc manage",
    },
  });

  for (const key of [
    PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
    PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
    PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
    PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
  ]) {
    const perm = await prisma.permission.findUnique({ where: { key } });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: perm!.id },
    });
  }

  await prisma.userRole.create({
    data: { tenantId: TENANT_ID, userId: user.id, roleId: role.id },
  });

  const space = await prisma.tenantDocumentationSpace.create({
    data: {
      tenantId: TENANT_ID,
      slug: "vereinsleitung",
      title: "Vereinsleitung",
      ownerUserId: user.id,
    },
  });

  await prisma.tenantDocumentationAccessGrant.create({
    data: {
      tenantId: TENANT_ID,
      resourceType: TenantDocumentationResourceType.SPACE,
      spaceId: space.id,
      subjectType: TenantDocumentationAccessSubjectType.CLUB,
      accessLevel: TenantDocumentationAccessLevel.MANAGE,
    },
  });

  const parent = await prisma.tenantDocumentationPage.create({
    data: {
      tenantId: TENANT_ID,
      spaceId: space.id,
      title: "Parent With Child",
      slug: "parent-with-child",
      sortOrder: 0,
    },
  });

  const leaf = await prisma.tenantDocumentationPage.create({
    data: {
      tenantId: TENANT_ID,
      spaceId: space.id,
      parentId: parent.id,
      title: LEAF_TITLE,
      slug: "lifecycle-leaf",
      sortOrder: 0,
    },
  });

  for (const page of [parent, leaf]) {
    const initialState = emptyYjsState();
    const contentJson = yjsStateToRichTextSnapshot(initialState);
    await prisma.tenantDocumentationPageDraft.create({
      data: {
        pageId: page.id,
        tenantId: TENANT_ID,
        contentJson,
        yjsState: Buffer.from(initialState),
        revision: BigInt(0),
        saveStatus: TenantDocumentationDraftSaveStatus.SAVED,
        updatedByUserId: user.id,
      },
    });
  }

  console.log(
    JSON.stringify({
      tenantId: TENANT_ID,
      parentPageId: parent.id,
      leafPageId: leaf.id,
      leafTitle: LEAF_TITLE,
      email: EMAIL,
      password: PASSWORD,
    }),
  );
}

main().catch((err) => {
  console.error("[tenant-documentation-lifecycle-browser-fixture] FAILED", err);
  process.exit(1);
});