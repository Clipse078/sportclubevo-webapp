/**
 * PR #1025 — Dokumentation page archive, trash, restore, and guards (disposable Postgres).
 */

import { PermissionModule } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { resolveTenantDocumentationActor } from "@/lib/tenant-documentation/authorization";
import {
  archiveDocumentationPage,
  restoreArchivedDocumentationPage,
  TenantDocumentationLifecycleError,
  trashDocumentationPage,
} from "@/lib/tenant-documentation/page-lifecycle-service";
import { createDocumentationPage, ensureDefaultSpace } from "@/lib/tenant-documentation/page-tree-service";
import { searchPublishedDocumentation } from "@/lib/tenant-documentation/search-service";
import { listAccessiblePageTree } from "@/lib/tenant-documentation/page-tree-service";

const RUN = `tdoc-life-${Date.now()}`;
const TENANT_ID = `tdoc-life-tenant-${RUN}`;

const dbReady = Boolean(process.env.TEST_DATABASE_URL);

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

describe.skipIf(!dbReady)("tenant documentation page lifecycle", () => {
  let spaceId: string;
  let parentId: string;
  let childId: string;
  let actor: Awaited<ReturnType<typeof resolveTenantDocumentationActor>>;

  beforeAll(async () => {
    assertSafeTestDatabase();
    await ensurePermissions();

    await prisma.tenant.create({
      data: { id: TENANT_ID, slug: `tdoc-life-${RUN}`, name: `Doc Life ${RUN}` },
    });

    const user = await prisma.user.create({
      data: {
        email: `doc-life-${RUN}@fixture.local`,
        passwordHash: "fixture",
        firstName: "Doc",
        lastName: "Manager",
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
        key: `doc_manage_${RUN}`,
        name: "Doc manage",
      },
    });

    for (const key of [
      PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
      PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
      PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
    ]) {
      const permission = await prisma.permission.findUnique({ where: { key } });
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission!.id },
      });
    }

    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id, tenantId: TENANT_ID },
    });

    actor = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: user.id,
      permissionKeys: [
        PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
        PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
        PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
        PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
      ],
    });

    const space = await ensureDefaultSpace(TENANT_ID, user.id);
    spaceId = space.id;

    const parent = await createDocumentationPage({
      actor,
      actorUserId: user.id,
      spaceId,
      parentId: null,
      title: "Parent",
      slug: `parent-${RUN}`,
    });
    parentId = parent.id;

    const child = await createDocumentationPage({
      actor,
      actorUserId: user.id,
      spaceId,
      parentId: parent.id,
      title: "Child",
      slug: `child-${RUN}`,
    });
    childId = child.id;
  });

  it("blocks archive when active children exist", async () => {
    await expect(
      archiveDocumentationPage({ actor, pageId: parentId }),
    ).rejects.toMatchObject({
      code: "HAS_ACTIVE_CHILDREN",
    } satisfies Partial<TenantDocumentationLifecycleError>);
  });

  it("archives leaf page and excludes it from tree", async () => {
    await archiveDocumentationPage({ actor, pageId: childId });
    const tree = await listAccessiblePageTree(actor, spaceId);
    const flat = JSON.stringify(tree);
    expect(flat).not.toContain(childId);
  });

  it("restores archived page back to active tree", async () => {
    const restored = await restoreArchivedDocumentationPage({ actor, pageId: childId });
    expect(restored.pageId).toBe(childId);
    const tree = await listAccessiblePageTree(actor, spaceId);
    expect(JSON.stringify(tree)).toContain(childId);
  });

  it("trash removes page from search results", async () => {
    await prisma.tenantDocumentationPage.update({
      where: { id: childId },
      data: { title: `SearchUnique-${RUN}` },
    });
    await trashDocumentationPage({ actor, pageId: childId });
    const hits = await searchPublishedDocumentation(actor, `SearchUnique-${RUN}`);
    expect(hits.some((h) => h.pageId === childId)).toBe(false);
  });
});