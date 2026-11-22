/**
 * PR #1025 — published version history list + snapshot access (disposable Postgres).
 */

import {
  PermissionModule,
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationDraftSaveStatus,
  TenantDocumentationResourceType,
} from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { resolveTenantDocumentationActor } from "@/lib/tenant-documentation/authorization";
import { publishPageDraft } from "@/lib/tenant-documentation/publish-service";
import {
  listPageVersionHistory,
  loadPageVersionSnapshot,
} from "@/lib/tenant-documentation/version-history-service";
import { emptyYjsState, yjsStateToRichTextSnapshot } from "@/lib/tenant-documentation/yjs-document";

const RUN = `tdoc-ver-${Date.now()}`;
const TENANT_ID = `tdoc-ver-tenant-${RUN}`;

const dbReady = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!dbReady)("tenant documentation version history", () => {
  let pageId: string;
  let actor: Awaited<ReturnType<typeof resolveTenantDocumentationActor>>;
  let userId: string;
  let versionIds: string[] = [];

  beforeAll(async () => {
    assertSafeTestDatabase();
    await prisma.tenant.create({
      data: { id: TENANT_ID, key: `key-${RUN}`, name: `Ver ${RUN}` },
    });
    const user = await prisma.user.create({
      data: {
        email: `ver-${RUN}@fixture.local`,
        passwordHash: "fixture",
        firstName: "Ver",
        lastName: "Publisher",
        isActive: true,
      },
    });
    userId = user.id;
    await prisma.tenantMembership.create({
      data: { tenantId: TENANT_ID, userId: user.id, isActive: true },
    });
    for (const key of [
      PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
      PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
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
    const role = await prisma.role.create({
      data: { tenantId: TENANT_ID, scope: "TENANT", key: `ver_${RUN}`, name: "ver" },
    });
    for (const key of [
      PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
      PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
    ]) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm!.id } });
    }
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id, tenantId: TENANT_ID } });

    actor = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: user.id,
      permissionKeys: [
        PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
        PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
        PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
      ],
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
    const page = await prisma.tenantDocumentationPage.create({
      data: {
        tenantId: TENANT_ID,
        spaceId: space.id,
        title: "Version Test",
        slug: "version-test",
        sortOrder: 0,
      },
    });
    pageId = page.id;
    const yjs = emptyYjsState();
    await prisma.tenantDocumentationPageDraft.create({
      data: {
        pageId,
        tenantId: TENANT_ID,
        contentJson: yjsStateToRichTextSnapshot(yjs),
        yjsState: Buffer.from(yjs),
        revision: BigInt(0),
        saveStatus: TenantDocumentationDraftSaveStatus.SAVED,
        updatedByUserId: user.id,
      },
    });
  });

  it("lists versions after each publish and marks current", async () => {
    const v1 = await publishPageDraft(actor, userId, pageId);
    const v2 = await publishPageDraft(actor, userId, pageId);
    versionIds = [v1.id, v2.id];

    const list = await listPageVersionHistory(actor, pageId);
    expect(list).toHaveLength(2);
    expect(list[0]?.versionNumber).toBe(2);
    expect(list[0]?.isCurrent).toBe(true);
    expect(list[1]?.isCurrent).toBe(false);
  });

  it("loads older published snapshot for read", async () => {
    const olderId = versionIds[0];
    const snapshot = await loadPageVersionSnapshot(actor, pageId, olderId!);
    expect(snapshot.isCurrent).toBe(false);
    expect(snapshot.version.versionNumber).toBe(1);
  });
});