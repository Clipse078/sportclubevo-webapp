import { beforeEach, describe, expect, it } from "vitest";
import {
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationResourceType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { synchronizePageCollaboration } from "@/lib/tenant-documentation/collaboration-sync-service";
import { resolveTenantDocumentationActor } from "@/lib/tenant-documentation/authorization";
import * as Y from "yjs";

const TENANT_ID = "tenant-doc-collab-it";

async function seedDisposableTenant() {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    create: { id: TENANT_ID, key: "tdoc-it", name: "TDoc IT" },
    update: {},
  });

  const userA = await prisma.user.upsert({
    where: { email: "tdoc-editor-a@example.test" },
    create: {
      email: "tdoc-editor-a@example.test",
      name: "Lara Keller",
      isActive: true,
    },
    update: {},
  });
  const userB = await prisma.user.upsert({
    where: { email: "tdoc-editor-b@example.test" },
    create: {
      email: "tdoc-editor-b@example.test",
      name: "Marco Rüegsegger",
      isActive: true,
    },
    update: {},
  });

  for (const user of [userA, userB]) {
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: TENANT_ID, userId: user.id } },
      create: { tenantId: TENANT_ID, userId: user.id },
      update: {},
    });
  }

  return { userA, userB };
}

const dbReady = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!dbReady)("tenant documentation collaboration sync", () => {
  let pageId: string;

  beforeEach(async () => {
    await seedDisposableTenant();
    const space = await prisma.tenantDocumentationSpace.create({
      data: {
        tenantId: TENANT_ID,
        slug: "it-space",
        title: "IT Space",
      },
    });
    await prisma.tenantDocumentationAccessGrant.create({
      data: {
        tenantId: TENANT_ID,
        resourceType: TenantDocumentationResourceType.SPACE,
        spaceId: space.id,
        subjectType: TenantDocumentationAccessSubjectType.CLUB,
        accessLevel: TenantDocumentationAccessLevel.EDIT,
      },
    });
    const page = await prisma.tenantDocumentationPage.create({
      data: {
        tenantId: TENANT_ID,
        spaceId: space.id,
        title: "Protokoll",
        slug: "protokoll",
      },
    });
    pageId = page.id;
  });

  it("merges concurrent edits and exposes both presences", async () => {
    const { userA, userB } = await seedDisposableTenant();
    const keys = [
      PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
    ];

    const actorA = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: userA.id,
      permissionKeys: keys,
    });
    const actorB = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: userB.id,
      permissionKeys: keys,
    });

    const docA = new Y.Doc();
    const updateA = Buffer.from(Y.encodeStateAsUpdate(docA)).toString("base64");

    await synchronizePageCollaboration(actorA, userA.id, {
      pageId,
      clientId: "client-a",
      displayName: "Lara Keller",
      updateBase64: updateA,
    });

    const docB = new Y.Doc();
    docB.getText("shared").insert(0, "Beschlüsse");
    const updateB = Buffer.from(Y.encodeStateAsUpdate(docB)).toString("base64");

    const result = await synchronizePageCollaboration(actorB, userB.id, {
      pageId,
      clientId: "client-b",
      displayName: "Marco Rüegsegger",
      updateBase64: updateB,
    });

    expect(result.presences.length).toBeGreaterThanOrEqual(2);
    expect(result.saveStatus).toBe("SAVED");
  });
});