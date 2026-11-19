/**
 * SCE-ANLIEGEN-02 — disposable Postgres integration (TEST_DATABASE_URL only).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NotificationType } from "@prisma/client";
import {
  assignClubMeldung,
  createClubMeldung,
  postClubMeldungMessage,
} from "@/lib/club-meldungen/meldung-service";
import { searchMeldungMentionCandidates } from "@/lib/club-meldungen/meldung-mention-candidates";
import { listClubMeldungReporterTimeline } from "@/lib/club-meldungen/queries";
import { meldungMentionToken } from "@/lib/club-meldungen/meldung-mention-tokens";
import {
  isClubMeldungMentionSchemaReady,
  resetClubMeldungMentionSchemaReadyCacheForTests,
} from "@/lib/club-meldungen/schema-mention-ready";
import * as notificationService from "@/lib/notifications/notification-service";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { prisma } from "@/lib/db/prisma";

const RUN = `sce-anliegen-02-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function createMember(
  client: PrismaClient,
  tenantId: string,
  label: string,
  active = true,
) {
  const user = await client.user.create({
    data: {
      email: `${label}-${RUN}@fixture.local`,
      passwordHash: "fixture",
      firstName: label,
      lastName: "Test",
      isActive: active,
      tenantId,
    },
  });
  await client.tenantMembership.create({
    data: { tenantId, userId: user.id, isActive: active },
  });
  return user;
}

async function grantTenantPermission(
  tenantId: string,
  userId: string,
  permissionKey: PermissionKey,
) {
  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) return;
  await prisma.userPermissionOverride.upsert({
    where: {
      tenantId_userId_permissionId: {
        tenantId,
        userId,
        permissionId: permission.id,
      },
    },
    create: {
      tenantId,
      userId,
      permissionId: permission.id,
      effect: "ALLOW",
    },
    update: { effect: "ALLOW" },
  });
}

function resolveCreatedByUser(
  tenantId: string,
  meldungId: string,
): Promise<{ id: string; firstName: string; lastName: string } | null> {
  return listClubMeldungReporterTimeline(tenantId, meldungId, true).then((timeline) => {
    const createdEvent = timeline.history.find((event) => event.eventType === "CREATED");
    return createdEvent?.actor
      ? {
          id: createdEvent.actor.id,
          firstName: createdEvent.actor.firstName,
          lastName: createdEvent.actor.lastName,
        }
      : null;
  });
}

describe("SCE-ANLIEGEN-02 meldung @mentions (disposable Postgres)", () => {
  let pool: ReturnType<typeof createSafeTestPrismaClient>["pool"];
  let tenantAId: string;
  let tenantBId: string;
  let reporterId: string;
  let delegateCreatorId: string;
  let handlerAId: string;
  let handlerBId: string;
  let outsiderId: string;
  let mentionReady = false;

  beforeAll(async () => {
    assertSafeTestDatabase();
    ({ pool } = createSafeTestPrismaClient());
    mentionReady = await isClubMeldungMentionSchemaReady();

    const tenantA = await prisma.tenant.create({
      data: { key: `anl02-a-${RUN}`, name: "Anliegen02 A" },
    });
    const tenantB = await prisma.tenant.create({
      data: { key: `anl02-b-${RUN}`, name: "Anliegen02 B" },
    });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    reporterId = (await createMember(prisma, tenantAId, "reporter")).id;
    delegateCreatorId = (await createMember(prisma, tenantAId, "delegate")).id;
    handlerAId = (await createMember(prisma, tenantAId, "handler-a")).id;
    handlerBId = (await createMember(prisma, tenantAId, "handler-b")).id;
    outsiderId = (await createMember(prisma, tenantAId, "outsider")).id;

    await grantTenantPermission(tenantAId, handlerAId, PERMISSIONS.MELDUNGEN_VIEW_ALL);
    await grantTenantPermission(tenantAId, handlerBId, PERMISSIONS.MELDUNGEN_VIEW_ALL);
    await grantTenantPermission(tenantAId, handlerAId, PERMISSIONS.MELDUNGEN_HANDLE);
    await grantTenantPermission(tenantAId, handlerBId, PERMISSIONS.MELDUNGEN_HANDLE);
  });

  afterAll(async () => {
    const tenants = [tenantAId, tenantBId].filter(Boolean);
    for (const tenantId of tenants) {
      await prisma.notification.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungMessageMention.deleteMany({ where: { tenantId } }).catch(() => undefined);
      await prisma.clubMeldungMessage.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungHistoryEvent.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungCollaborator.deleteMany({
        where: { meldung: { tenantId } },
      });
      await prisma.clubMeldungCreateIdempotency.deleteMany({ where: { tenantId } });
      await prisma.clubMeldung.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungNumberSequence.deleteMany({ where: { tenantId } });
      await prisma.userPermissionOverride.deleteMany({ where: { tenantId } });
      await prisma.tenantMembership.deleteMany({ where: { tenantId } });
      await prisma.user.deleteMany({ where: { email: { contains: RUN } } });
    }
    await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
    await pool?.end();
  });

  async function seedAssignedMeldung(suffix: string) {
    const created = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: `case-${suffix}`,
      description: "d",
      category: "OTHER",
      idempotencyKey: `case-${suffix}-${RUN}`,
    });
    await assignClubMeldung({
      tenantId: tenantAId,
      meldungId: created.meldung.id,
      actorUserId: handlerAId,
      accountableUserId: handlerAId,
      expectedVersion: created.meldung.version,
    });
    return created.meldung;
  }

  it("persists mention rows only when @token is present in body", async () => {
    if (!mentionReady) return;

    const meldung = await seedAssignedMeldung("token-link");
    const handlerB = await prisma.user.findUniqueOrThrow({ where: { id: handlerBId } });
    const token = meldungMentionToken(handlerB.firstName, handlerB.lastName);

    await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: `Bitte prüfen ${token}`,
      mentionedUserIds: [handlerBId],
    });

    await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: "ohne Token im Text",
      mentionedUserIds: [handlerBId],
    });

    const rows = await prisma.clubMeldungMessageMention.findMany({
      where: { tenantId: tenantAId, message: { meldungId: meldung.id } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(handlerBId);
  });

  it("rejects cross-tenant and unauthorized mention targets", async () => {
    if (!mentionReady) return;

    const meldung = await seedAssignedMeldung("authz");
    const handlerB = await prisma.user.findUniqueOrThrow({ where: { id: handlerBId } });
    const token = meldungMentionToken(handlerB.firstName, handlerB.lastName);
    const foreign = await createMember(prisma, tenantBId, "foreign");

    await expect(
      postClubMeldungMessage({
        tenantId: tenantAId,
        meldungId: meldung.id,
        actorUserId: handlerAId,
        audience: "INTERNAL_NOTE",
        body: `Hi ${token}`,
        mentionedUserIds: [foreign.id],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const outsiderToken = meldungMentionToken("outsider", "Test");
    await expect(
      postClubMeldungMessage({
        tenantId: tenantAId,
        meldungId: meldung.id,
        actorUserId: handlerAId,
        audience: "INTERNAL_NOTE",
        body: `Hi ${outsiderToken}`,
        mentionedUserIds: [outsiderId],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps internal mentions off the reporter timeline", async () => {
    if (!mentionReady) return;

    const meldung = await seedAssignedMeldung("confidential");
    const handlerB = await prisma.user.findUniqueOrThrow({ where: { id: handlerBId } });
    const token = meldungMentionToken(handlerB.firstName, handlerB.lastName);

    await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: `secret ${token}`,
      mentionedUserIds: [handlerBId],
    });

    const reporterView = await listClubMeldungReporterTimeline(tenantAId, meldung.id, false, true);
    expect(reporterView.messages).toHaveLength(0);
    const mentionsOnMessages = reporterView.messages.flatMap((m) => m.mentions ?? []);
    expect(mentionsOnMessages).toHaveLength(0);
  });

  it("deduplicates mention notifications and skips self-mentions", async () => {
    if (!mentionReady) return;

    const meldung = await seedAssignedMeldung("notify-dedup");
    const handlerB = await prisma.user.findUniqueOrThrow({ where: { id: handlerBId } });
    const self = await prisma.user.findUniqueOrThrow({ where: { id: handlerAId } });
    const tokenB = meldungMentionToken(handlerB.firstName, handlerB.lastName);
    const tokenSelf = meldungMentionToken(self.firstName, self.lastName);

    await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: `${tokenSelf} und ${tokenB} nochmal ${tokenB}`,
      mentionedUserIds: [handlerAId, handlerBId, handlerBId],
      tenantKey: `anl02-a-${RUN}`,
    });

    const notifications = await prisma.notification.findMany({
      where: {
        tenantId: tenantAId,
        type: NotificationType.MELDUNG_MENTION,
        entityId: meldung.id,
      },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.recipientUserId).toBe(handlerBId);
  });

  it("commits the comment when mention notification emission fails", async () => {
    if (!mentionReady) return;

    const meldung = await seedAssignedMeldung("notify-fail");
    const handlerB = await prisma.user.findUniqueOrThrow({ where: { id: handlerBId } });
    const token = meldungMentionToken(handlerB.firstName, handlerB.lastName);

    const spy = vi
      .spyOn(notificationService, "createNotificationIdempotent")
      .mockRejectedValueOnce(new Error("notification sink unavailable"));

    const message = await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: `Ping ${token}`,
      mentionedUserIds: [handlerBId],
      tenantKey: `anl02-a-${RUN}`,
    });
    spy.mockRestore();

    const persisted = await prisma.clubMeldungMessage.findUnique({ where: { id: message.id } });
    expect(persisted?.body).toContain("Ping");
    const mentionRows = await prisma.clubMeldungMessageMention.count({
      where: { messageId: message.id },
    });
    expect(mentionRows).toBe(1);
  });

  it("allocates a fresh dedup key per mention message on retry posts", async () => {
    if (!mentionReady) return;

    const meldung = await seedAssignedMeldung("notify-retry");
    const handlerB = await prisma.user.findUniqueOrThrow({ where: { id: handlerBId } });
    const token = meldungMentionToken(handlerB.firstName, handlerB.lastName);

    const first = await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: `Retry one ${token}`,
      mentionedUserIds: [handlerBId],
      tenantKey: `anl02-a-${RUN}`,
    });
    const second = await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: `Retry two ${token}`,
      mentionedUserIds: [handlerBId],
      tenantKey: `anl02-a-${RUN}`,
    });

    const keys = (
      await prisma.notification.findMany({
        where: {
          tenantId: tenantAId,
          type: NotificationType.MELDUNG_MENTION,
          recipientUserId: handlerBId,
          entityId: meldung.id,
        },
        select: { deduplicationKey: true },
        orderBy: { createdAt: "asc" },
      })
    ).map((row) => row.deduplicationKey);

    expect(keys).toEqual([
      `MELDUNG_MENTION:${first.id}:${handlerBId}`,
      `MELDUNG_MENTION:${second.id}:${handlerBId}`,
    ]);
  });

  it("allows ordinary internal comments when mention schema is absent", async () => {
    if (!mentionReady) return;

    const meldung = await seedAssignedMeldung("schema-absent");
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "ClubMeldungMessageMention" CASCADE');
    resetClubMeldungMentionSchemaReadyCacheForTests();
    expect(await isClubMeldungMentionSchemaReady()).toBe(false);

    const message = await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: "Ohne Erwähnungsschema",
    });
    expect(message.body).toBe("Ohne Erwähnungsschema");

    const handlerB = await prisma.user.findUniqueOrThrow({ where: { id: handlerBId } });
    const blockedToken = meldungMentionToken(handlerB.firstName, handlerB.lastName);
    await expect(
      postClubMeldungMessage({
        tenantId: tenantAId,
        meldungId: meldung.id,
        actorUserId: handlerAId,
        audience: "INTERNAL_NOTE",
        body: `Mit ${blockedToken}`,
        mentionedUserIds: [handlerBId],
      }),
    ).rejects.toThrow();

    const mentionMigrationSql = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL(
          "../../../prisma/migrations/20261120130000_sce_anliegen_02_mentions/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await prisma.$executeRawUnsafe(mentionMigrationSql);
    resetClubMeldungMentionSchemaReadyCacheForTests();
    expect(await isClubMeldungMentionSchemaReady()).toBe(true);
  });

  it("omits revoked internal viewers from mention candidates", async () => {
    if (!mentionReady) return;

    const revokedViewerId = (await createMember(prisma, tenantAId, "revoked-viewer")).id;
    await grantTenantPermission(tenantAId, revokedViewerId, PERMISSIONS.MELDUNGEN_VIEW_ALL);

    const meldung = await seedAssignedMeldung("candidates");

    const before = await searchMeldungMentionCandidates({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      search: "revoked",
    });
    expect(before.some((row) => row.userId === revokedViewerId)).toBe(true);

    await prisma.userPermissionOverride.deleteMany({
      where: {
        tenantId: tenantAId,
        userId: revokedViewerId,
        permission: { key: PERMISSIONS.MELDUNGEN_VIEW_ALL },
      },
    });

    const after = await searchMeldungMentionCandidates({
      tenantId: tenantAId,
      meldungId: meldung.id,
      actorUserId: handlerAId,
      search: "revoked",
    });
    expect(after.some((row) => row.userId === revokedViewerId)).toBe(false);
  });

  it("resolves Erstellt von from CREATED history actor, not assignee or reporter substitute", async () => {
    const meldung = await seedAssignedMeldung("creator");

    await prisma.clubMeldungHistoryEvent.updateMany({
      where: {
        tenantId: tenantAId,
        meldungId: meldung.id,
        eventType: "CREATED",
      },
      data: { actorUserId: delegateCreatorId },
    });

    const createdBy = await resolveCreatedByUser(tenantAId, meldung.id);
    expect(createdBy?.id).toBe(delegateCreatorId);
    expect(createdBy?.id).not.toBe(handlerAId);
    expect(createdBy?.id).not.toBe(reporterId);

    await prisma.clubMeldungHistoryEvent.deleteMany({
      where: { tenantId: tenantAId, meldungId: meldung.id, eventType: "CREATED" },
    });
    const fallback = await resolveCreatedByUser(tenantAId, meldung.id);
    expect(fallback).toBeNull();
  });
});