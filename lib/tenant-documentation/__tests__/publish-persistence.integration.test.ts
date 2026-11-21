/**
 * PR #1025 — disposable Postgres: co-edit, @mentions, publish, notifications.
 */

import { describe, expect, it, beforeEach } from "vitest";
import * as Y from "yjs";
import {
  NotificationType,
  PermissionModule,
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationResourceType,
} from "@prisma/client";

import { extractMentionUserIdsFromTipTapJson } from "@/lib/collaboration/mentions/extract-mention-user-ids";
import { SCE_INLINE_MENTION_MARK_NAME } from "@/lib/collaboration/mentions/inline-mention-mark";
import { prisma } from "@/lib/db/prisma";
import type { RichTextValue } from "@/lib/cms/rich-text";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { resolveTenantDocumentationActor } from "@/lib/tenant-documentation/authorization";
import { synchronizePageCollaboration } from "@/lib/tenant-documentation/collaboration-sync-service";
import { publishPageDraft } from "@/lib/tenant-documentation/publish-service";
import {
  mergeYjsUpdate,
  TENANT_DOC_YJS_FRAGMENT,
  yjsStateToRichTextSnapshot,
} from "@/lib/tenant-documentation/yjs-document";

const TENANT_ID = "tenant-doc-persist-it";
const OTHER_TENANT_ID = "tenant-doc-persist-other";

async function ensureTenantDocumentationPermissionCatalog() {
  const defs = [
    {
      key: PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      name: "Dokumentation anzeigen",
    },
    {
      key: PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
      name: "Dokumentation bearbeiten",
    },
    {
      key: PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
      name: "Dokumentation veröffentlichen",
    },
    {
      key: PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
      name: "Dokumentation verwalten",
    },
  ] as const;
  for (const def of defs) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        name: def.name,
        module: PermissionModule.TENANT_DOCUMENTATION,
        scope: "TENANT",
        grantableByAdmin: true,
      },
      update: {
        name: def.name,
        module: PermissionModule.TENANT_DOCUMENTATION,
      },
    });
  }
}

async function grantTenantPermission(userId: string, permissionKey: PermissionKey) {
  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) {
    throw new Error(`Permission missing in catalog: ${permissionKey}`);
  }
  await prisma.userPermissionOverride.upsert({
    where: {
      tenantId_userId_permissionId: {
        tenantId: TENANT_ID,
        userId,
        permissionId: permission.id,
      },
    },
    create: {
      tenantId: TENANT_ID,
      userId,
      permissionId: permission.id,
      effect: "ALLOW",
    },
    update: { effect: "ALLOW" },
  });
}

async function seedTenantDocumentationFixture() {
  await ensureTenantDocumentationPermissionCatalog();
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    create: { id: TENANT_ID, key: "tdoc-persist", name: "TDoc Persist" },
    update: {},
  });
  await prisma.tenant.upsert({
    where: { id: OTHER_TENANT_ID },
    create: { id: OTHER_TENANT_ID, key: "tdoc-other", name: "TDoc Other" },
    update: {},
  });

  const editorA = await prisma.user.upsert({
    where: { email: "tdoc-pub-a@example.test" },
    create: {
      email: "tdoc-pub-a@example.test",
      firstName: "Lara",
      lastName: "Keller",
      passwordHash: "fixture",
      isActive: true,
    },
    update: {},
  });
  const editorB = await prisma.user.upsert({
    where: { email: "tdoc-pub-b@example.test" },
    create: {
      email: "tdoc-pub-b@example.test",
      firstName: "Marco",
      lastName: "Rüegsegger",
      passwordHash: "fixture",
      isActive: true,
    },
    update: {},
  });
  const mentionTarget = await prisma.user.upsert({
    where: { email: "tdoc-mention-target@example.test" },
    create: {
      email: "tdoc-mention-target@example.test",
      firstName: "Samuel",
      lastName: "Meier",
      passwordHash: "fixture",
      isActive: true,
    },
    update: {},
  });
  const deniedMention = await prisma.user.upsert({
    where: { email: "tdoc-denied-mention@example.test" },
    create: {
      email: "tdoc-denied-mention@example.test",
      firstName: "Denied",
      lastName: "Reader",
      passwordHash: "fixture",
      isActive: true,
    },
    update: {},
  });
  const otherTenantUser = await prisma.user.upsert({
    where: { email: "tdoc-other-tenant@example.test" },
    create: {
      email: "tdoc-other-tenant@example.test",
      firstName: "Foreign",
      lastName: "Tenant",
      passwordHash: "fixture",
      isActive: true,
    },
    update: {},
  });

  for (const user of [editorA, editorB, mentionTarget, deniedMention]) {
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: TENANT_ID, userId: user.id } },
      create: { tenantId: TENANT_ID, userId: user.id },
      update: {},
    });
  }
  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: OTHER_TENANT_ID, userId: otherTenantUser.id } },
    create: { tenantId: OTHER_TENANT_ID, userId: otherTenantUser.id },
    update: {},
  });

  const publishKeys = [
    PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
    PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
    PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  ] as const;

  for (const user of [editorA, editorB]) {
    for (const key of publishKeys) {
      await grantTenantPermission(user.id, key);
    }
  }
  await grantTenantPermission(mentionTarget.id, PERMISSIONS.TENANT_DOCUMENTATION_VIEW);

  return { editorA, editorB, mentionTarget, deniedMention, otherTenantUser };
}

function mentionRichText(userId: string, label: string, body: string): RichTextValue {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: body,
            marks: [
              {
                type: SCE_INLINE_MENTION_MARK_NAME,
                attrs: { userId, label },
              },
            ],
          },
        ],
      },
    ],
  };
}

function encodeYjs(doc: Y.Doc): string {
  return Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");
}

const dbReady = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!dbReady)("tenant documentation publish persistence", () => {
  let pageId: string;
  let spaceId: string;
  let fixtures: Awaited<ReturnType<typeof seedTenantDocumentationFixture>>;

  beforeEach(async () => {
    fixtures = await seedTenantDocumentationFixture();
    const runSlug = `persist-space-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const space = await prisma.tenantDocumentationSpace.create({
      data: {
        tenantId: TENANT_ID,
        slug: runSlug,
        title: "Persist Space",
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
    const page = await prisma.tenantDocumentationPage.create({
      data: {
        tenantId: TENANT_ID,
        spaceId,
        title: "Sitzungsprotokoll",
        slug: "sitzungsprotokoll",
      },
    });
    pageId = page.id;

    const published = await prisma.tenantDocumentationPageVersion.create({
      data: {
        tenantId: TENANT_ID,
        pageId,
        versionNumber: 1,
        contentJson: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Veröffentlicht v1" }] }],
        },
        plainText: "Veröffentlicht v1",
        publishedByUserId: fixtures.editorA.id,
      },
    });
    await prisma.tenantDocumentationPage.update({
      where: { id: pageId },
      data: { publishedVersionId: published.id },
    });
  });

  it("merges dual-editor draft, preserves mention identity through publish, and stubs notification delivery", async () => {
    const keys = [
      PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
      PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
    ];
    const actorA = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: fixtures.editorA.id,
      permissionKeys: keys,
    });
    const actorB = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: fixtures.editorB.id,
      permissionKeys: keys,
    });

    const mentionJson = mentionRichText(
      fixtures.mentionTarget.id,
      "Samuel Meier",
      "@Samuel Meier",
    );

    await synchronizePageCollaboration(actorA, fixtures.editorA.id, {
      pageId,
      clientId: "client-a",
      displayName: "Lara Keller",
      contentJson: mentionJson,
      updateBase64: encodeYjs(new Y.Doc()),
    });

    const docB = new Y.Doc();
    const frag = docB.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    const paragraph = new Y.XmlElement("paragraph");
    const text = new Y.XmlText();
    text.insert(0, "Beschluss: Training Donnerstag");
    paragraph.insert(0, [text]);
    frag.insert(0, [paragraph]);
    const combinedJson: RichTextValue = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "@Samuel Meier",
              marks: [
                {
                  type: SCE_INLINE_MENTION_MARK_NAME,
                  attrs: { userId: fixtures.mentionTarget.id, label: "Samuel Meier" },
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Beschluss: Training Donnerstag" }],
        },
      ],
    };

    const syncB = await synchronizePageCollaboration(actorB, fixtures.editorB.id, {
      pageId,
      clientId: "client-b",
      displayName: "Marco Rüegsegger",
      updateBase64: encodeYjs(docB),
      contentJson: combinedJson,
    });

    expect(syncB.publishedVersionId).not.toBeNull();

    await synchronizePageCollaboration(actorB, fixtures.editorB.id, {
      pageId,
      clientId: "client-b",
      displayName: "Marco Rüegsegger",
      markDisconnected: true,
    });

    const reconnectB = await synchronizePageCollaboration(actorB, fixtures.editorB.id, {
      pageId,
      clientId: "client-b-reconnect",
      displayName: "Marco Rüegsegger",
      stateVectorBase64: encodeYjs(new Y.Doc()),
    });
    expect(reconnectB.presences.length).toBeGreaterThanOrEqual(1);

    const publisher = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: fixtures.editorA.id,
      permissionKeys: keys,
    });
    const version = await publishPageDraft(publisher, fixtures.editorA.id, pageId, {
      actorDisplayName: "Lara Keller",
    });

    const draft = await prisma.tenantDocumentationPageDraft.findUnique({ where: { pageId } });
    expect(draft).not.toBeNull();
    const mentionIds = extractMentionUserIdsFromTipTapJson(version.contentJson);
    expect(mentionIds).toContain(fixtures.mentionTarget.id);

    const publishedBody = JSON.stringify(version.contentJson);
    expect(publishedBody).toContain("Samuel Meier");
    expect(publishedBody).toContain("Training Donnerstag");

    const notifications = await prisma.notification.findMany({
      where: {
        tenantId: TENANT_ID,
        type: NotificationType.TENANT_DOCUMENTATION_MENTION,
        entityId: pageId,
      },
    });
    expect(notifications.some((n) => n.recipientUserId === fixtures.mentionTarget.id)).toBe(true);
    expect(notifications.some((n) => n.recipientUserId === fixtures.deniedMention.id)).toBe(false);
    expect(notifications.every((n) => n.recipientUserId !== fixtures.otherTenantUser.id)).toBe(
      true,
    );

    await publishPageDraft(publisher, fixtures.editorA.id, pageId, {
      actorDisplayName: "Lara Keller",
    });
    const afterRetry = await prisma.notification.count({
      where: {
        tenantId: TENANT_ID,
        type: NotificationType.TENANT_DOCUMENTATION_MENTION,
        entityId: pageId,
        recipientUserId: fixtures.mentionTarget.id,
      },
    });
    expect(afterRetry).toBe(1);
  });

  it("rejects stale contentJson that would drop mention marks without a Yjs update", async () => {
    const keys = [
      PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
    ];
    const actorA = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: fixtures.editorA.id,
      permissionKeys: keys,
    });
    const actorB = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: fixtures.editorB.id,
      permissionKeys: keys,
    });

    const mentionJson = mentionRichText(
      fixtures.mentionTarget.id,
      "Samuel Meier",
      "@Samuel Meier",
    );
    await synchronizePageCollaboration(actorA, fixtures.editorA.id, {
      pageId,
      clientId: "client-a",
      displayName: "Lara Keller",
      contentJson: mentionJson,
      updateBase64: encodeYjs(new Y.Doc()),
    });

    const docB = new Y.Doc();
    const frag = docB.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    const paragraph = new Y.XmlElement("paragraph");
    const text = new Y.XmlText();
    text.insert(0, "ergänzender Absatz");
    paragraph.insert(0, [text]);
    frag.insert(0, [paragraph]);
  await synchronizePageCollaboration(actorB, fixtures.editorB.id, {
      pageId,
      clientId: "client-b",
      displayName: "Marco Rüegsegger",
      updateBase64: encodeYjs(docB),
      contentJson: {
        type: "doc",
        content: [
          ...mentionJson.content,
          { type: "paragraph", content: [{ type: "text", text: "ergänzender Absatz" }] },
        ],
      },
    });

    await synchronizePageCollaboration(actorA, fixtures.editorA.id, {
      pageId,
      clientId: "client-a-stale",
      displayName: "Lara Keller",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "stale autosave" }] }],
      },
    });

    const draft = await prisma.tenantDocumentationPageDraft.findUniqueOrThrow({
      where: { pageId },
    });
    const mentionIds = extractMentionUserIdsFromTipTapJson(draft.contentJson);
    expect(mentionIds).toContain(fixtures.mentionTarget.id);

    const yjsPlain = yjsStateToRichTextSnapshot(new Uint8Array(draft.yjsState));
    expect(JSON.stringify(yjsPlain)).toContain("ergänzender");
  });

  it("uses merged Yjs state as authoritative body when publish reads draft snapshot", async () => {
    const keys = [
      PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
      PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
      PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
    ];
    const actorA = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: fixtures.editorA.id,
      permissionKeys: keys,
    });

    const base = new Y.Doc();
    const frag = base.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    const paragraph = new Y.XmlElement("paragraph");
    const text = new Y.XmlText();
    text.insert(0, "vereinbart");
    paragraph.insert(0, [text]);
    frag.insert(0, [paragraph]);
    let merged = Y.encodeStateAsUpdate(base);

    const clientB = new Y.Doc();
    Y.applyUpdate(clientB, merged);
    const fragB = clientB.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
    const textB = (fragB.get(0) as Y.XmlElement).get(0) as Y.XmlText;
    textB.insert(textB.length, " + Marco");

    merged = mergeYjsUpdate(merged, Y.encodeStateAsUpdate(clientB));

    await synchronizePageCollaboration(actorA, fixtures.editorA.id, {
      pageId,
      clientId: "client-b-delayed",
      displayName: "Marco Rüegsegger",
      updateBase64: Buffer.from(Y.encodeStateAsUpdate(clientB)).toString("base64"),
    });

    const publisher = await resolveTenantDocumentationActor({
      tenantId: TENANT_ID,
      userId: fixtures.editorA.id,
      permissionKeys: keys,
    });
    const version = await publishPageDraft(publisher, fixtures.editorA.id, pageId);
    const plain = JSON.stringify(version.contentJson);
    expect(plain).toContain("Marco");
  });
});