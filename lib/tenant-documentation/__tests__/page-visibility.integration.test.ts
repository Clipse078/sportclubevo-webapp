/**
 * PR #1025 — page creation, publish audience, search isolation (disposable Postgres).
 */

import {
  PermissionModule,
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationResourceType,
} from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { resolveTenantDocumentationActor } from "@/lib/tenant-documentation/authorization";
import {
  createDocumentationPage,
  slugifyDocumentationTitle,
} from "@/lib/tenant-documentation/page-tree-service";
import { actorCanViewPublishedPage } from "@/lib/tenant-documentation/page-visibility-service";
import {
  replacePagePublishAudienceGrants,
  resolveEffectivePublishAudience,
} from "@/lib/tenant-documentation/publish-audience";
import { searchPublishedDocumentation } from "@/lib/tenant-documentation/search-service";
import { publishPageDraft } from "@/lib/tenant-documentation/publish-service";
import { emptyYjsState, yjsStateToRichTextSnapshot } from "@/lib/tenant-documentation/yjs-document";

const RUN = `tdoc-vis-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const TENANT_ID = `tenant-${RUN}`;
const dbReady = Boolean(process.env.TEST_DATABASE_URL);

async function ensurePermissions() {
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
}

async function createUser(email: string, permissionKeys: string[]) {
  const user = await prisma.user.create({
    data: {
      email: `${email}-${RUN}@fixture.local`,
      firstName: email,
      lastName: "Test",
      passwordHash: "fixture",
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
      key: `role_${email}_${RUN}`,
      name: email,
    },
  });
  for (const key of permissionKeys) {
    const perm = await prisma.permission.findUnique({ where: { key } });
    if (!perm) throw new Error(`missing ${key}`);
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: perm.id },
    });
  }
  await prisma.userRole.create({
    data: { tenantId: TENANT_ID, userId: user.id, roleId: role.id },
  });
  return user;
}

describe.skipIf(!dbReady)("tenant documentation page visibility", () => {
  let spaceId: string;
  let orgA: string;
  let orgB: string;
  let editorId: string;
  let memberAId: string;
  let memberBId: string;
  let personAId: string;
  let personBId: string;

  beforeAll(async () => {
    assertSafeTestDatabase();
    await ensurePermissions();
    await prisma.tenant.create({
      data: { id: TENANT_ID, key: `key-${RUN}`, name: "Vis Test" },
    });

    const editor = await createUser("editor", [
      PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
      PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
    ]);
    editorId = editor.id;

    const memberA = await createUser("member-a", [PERMISSIONS.TENANT_DOCUMENTATION_VIEW]);
    memberAId = memberA.id;
    const memberB = await createUser("member-b", [PERMISSIONS.TENANT_DOCUMENTATION_VIEW]);
    memberBId = memberB.id;

    const ouA = await prisma.orgUnit.create({
      data: { tenantId: TENANT_ID, name: "OU A", slug: `ou-a-${RUN}` },
    });
    const ouB = await prisma.orgUnit.create({
      data: { tenantId: TENANT_ID, name: "OU B", slug: `ou-b-${RUN}` },
    });
    orgA = ouA.id;
    orgB = ouB.id;

    const personA = await prisma.person.create({
      data: { tenantId: TENANT_ID, userId: memberAId, firstName: "A", lastName: "User" },
    });
    const personB = await prisma.person.create({
      data: { tenantId: TENANT_ID, userId: memberBId, firstName: "B", lastName: "User" },
    });
    personAId = personA.id;
    personBId = personB.id;

    await prisma.orgUnitMembership.createMany({
      data: [
        { tenantId: TENANT_ID, orgUnitId: orgA, personId: personAId, status: "ACTIVE" },
        { tenantId: TENANT_ID, orgUnitId: orgB, personId: personBId, status: "ACTIVE" },
      ],
    });

    const space = await prisma.tenantDocumentationSpace.create({
      data: {
        tenantId: TENANT_ID,
        slug: "default",
        title: "Default",
        ownerUserId: editorId,
      },
    });
    spaceId = space.id;

    await prisma.tenantDocumentationAccessGrant.create({
      data: {
        tenantId: TENANT_ID,
        resourceType: TenantDocumentationResourceType.SPACE,
        spaceId,
        subjectType: TenantDocumentationAccessSubjectType.CLUB,
        accessLevel: TenantDocumentationAccessLevel.EDIT,
      },
    });
  });

  async function actorFor(userId: string) {
    const resolver = createEffectivePermissionResolver(prisma);
    const { platform, tenant } = await resolver.getEffectivePermissions({
      userId,
      tenantId: TENANT_ID,
    });
    return resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId,
      permissionKeys: [...platform, ...tenant],
    });
  }

  it("creates root and child pages with stable ids and slugs", async () => {
    const editor = await actorFor(editorId);
    const root = await createDocumentationPage({
      actor: editor,
      actorUserId: editorId,
      spaceId,
      parentId: null,
      title: "Handbuch",
      slug: slugifyDocumentationTitle("Handbuch"),
    });
    const child = await createDocumentationPage({
      actor: editor,
      actorUserId: editorId,
      spaceId,
      parentId: root.id,
      title: "Kapitel",
      slug: slugifyDocumentationTitle("Kapitel"),
    });
    expect(child.parentId).toBe(root.id);

    const draft = await prisma.tenantDocumentationPageDraft.findUnique({
      where: { pageId: child.id },
    });
    expect(draft).toBeTruthy();
  });

  it("restricts published page to selected org units in search and direct view", async () => {
    const editor = await actorFor(editorId);
    const page = await createDocumentationPage({
      actor: editor,
      actorUserId: editorId,
      spaceId,
      parentId: null,
      title: `Restricted ${RUN}`,
      slug: slugifyDocumentationTitle(`restricted-${RUN}`),
    });

    await replacePagePublishAudienceGrants({
      tenantId: TENANT_ID,
      pageId: page.id,
      audience: { mode: "org_units", orgUnitIds: [orgA] },
    });

    const state = emptyYjsState();
    await prisma.tenantDocumentationPageDraft.upsert({
      where: { pageId: page.id },
      create: {
        pageId: page.id,
        tenantId: TENANT_ID,
        contentJson: yjsStateToRichTextSnapshot(state),
        yjsState: Buffer.from(state),
      },
      update: {},
    });

    await publishPageDraft(editor, editorId, page.id);

    const audience = await resolveEffectivePublishAudience(page.id, TENANT_ID);
    expect(audience.mode).toBe("org_units");

    const actorA = await actorFor(memberAId);
    const actorB = await actorFor(memberBId);
    expect(await actorCanViewPublishedPage(actorA, page.id)).toBe(true);
    expect(await actorCanViewPublishedPage(actorB, page.id)).toBe(false);

    const hitsA = await searchPublishedDocumentation(actorA, `Restricted ${RUN}`);
    const hitsB = await searchPublishedDocumentation(actorB, `Restricted ${RUN}`);
    expect(hitsA.some((h) => h.pageId === page.id)).toBe(true);
    expect(hitsB.some((h) => h.pageId === page.id)).toBe(false);
  });
});