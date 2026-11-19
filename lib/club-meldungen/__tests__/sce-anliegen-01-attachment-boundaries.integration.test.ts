/**
 * SCE-ANLIEGEN-01 attachment ownership + lifecycle (disposable Postgres only).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  assignClubMeldung,
  createClubMeldung,
  ClubMeldungServiceError,
} from "@/lib/club-meldungen/meldung-service";
import { authorizeClubMeldungAttachmentDownload } from "@/lib/club-meldungen/attachment-access";
import {
  canMutateMeldungInternal,
  canViewMeldungInternal,
} from "@/lib/club-meldungen/access";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { prisma } from "@/lib/db/prisma";

const RUN = `sce-att-${Date.now()}`;

async function createMember(client: PrismaClient, tenantId: string, label: string) {
  const user = await client.user.create({
    data: {
      email: `${label}-${RUN}@fixture.local`,
      passwordHash: "fixture",
      firstName: label,
      lastName: "Test",
      tenantId,
    },
  });
  await client.tenantMembership.create({
    data: { tenantId, userId: user.id, isActive: true },
  });
  return user;
}

describe("SCE-ANLIEGEN-01 attachment boundaries", () => {
  let pool: ReturnType<typeof createSafeTestPrismaClient>["pool"];
  let tenantId: string;
  let reporterId: string;
  let otherReporterId: string;
  let handlerId: string;
  let collabOnlyId: string;

  beforeAll(async () => {
    assertSafeTestDatabase();
    ({ pool } = createSafeTestPrismaClient());
    const tenant = await prisma.tenant.create({
      data: { key: `att-tenant-${RUN}`, name: "Attachment test" },
    });
    tenantId = tenant.id;
    reporterId = (await createMember(prisma, tenantId, "reporter")).id;
    otherReporterId = (await createMember(prisma, tenantId, "other")).id;
    handlerId = (await createMember(prisma, tenantId, "handler")).id;
    collabOnlyId = (await createMember(prisma, tenantId, "collab")).id;
  });

  afterAll(async () => {
    await prisma.clubMeldungAttachment.deleteMany({ where: { tenantId } });
    await prisma.clubMeldungCreateIdempotency.deleteMany({ where: { tenantId } });
    await prisma.clubMeldung.deleteMany({ where: { tenantId } });
    await prisma.communicationAttachment.deleteMany({ where: { tenantId } });
    await prisma.tenantMembership.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { email: { contains: RUN } } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await pool?.end();
  });

  it("rejects attachment owned by another user", async () => {
    const foreign = await prisma.communicationAttachment.create({
      data: {
        tenantId,
        storageKey: `foreign-${RUN}`,
        originalFilename: "x.txt",
        sanitizedFilename: "x.txt",
        contentType: "text/plain",
        sizeBytes: 1,
        checksumSha256: "c".repeat(64),
        sourceType: "UPLOAD",
        lifecycleStatus: "READY",
        scanStatus: "CLEAN",
        createdByUserId: otherReporterId,
      },
    });

    await expect(
      createClubMeldung({
        tenantId,
        reporterUserId: reporterId,
        subject: "steal",
        description: "d",
        category: "OTHER",
        idempotencyKey: `steal-${RUN}`,
        attachmentIds: [foreign.id],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects re-linking attachment already on another case", async () => {
    const att = await prisma.communicationAttachment.create({
      data: {
        tenantId,
        storageKey: `rel-${RUN}`,
        originalFilename: "y.txt",
        sanitizedFilename: "y.txt",
        contentType: "text/plain",
        sizeBytes: 1,
        checksumSha256: "d".repeat(64),
        sourceType: "UPLOAD",
        lifecycleStatus: "READY",
        scanStatus: "CLEAN",
        createdByUserId: reporterId,
      },
    });

    await createClubMeldung({
      tenantId,
      reporterUserId: reporterId,
      subject: "first",
      description: "d",
      category: "OTHER",
      idempotencyKey: `first-${RUN}`,
      attachmentIds: [att.id],
    });

    await expect(
      createClubMeldung({
        tenantId,
        reporterUserId: reporterId,
        subject: "second",
        description: "d",
        category: "OTHER",
        idempotencyKey: `second-${RUN}`,
        attachmentIds: [att.id],
      }),
    ).rejects.toBeInstanceOf(ClubMeldungServiceError);
  });

  it("idempotent retry returns same case without duplicating links", async () => {
    const att = await prisma.communicationAttachment.create({
      data: {
        tenantId,
        storageKey: `idem-${RUN}`,
        originalFilename: "z.txt",
        sanitizedFilename: "z.txt",
        contentType: "text/plain",
        sizeBytes: 1,
        checksumSha256: "e".repeat(64),
        sourceType: "UPLOAD",
        lifecycleStatus: "READY",
        scanStatus: "CLEAN",
        createdByUserId: reporterId,
      },
    });

    const idem = `idem-att-${RUN}`;
    const first = await createClubMeldung({
      tenantId,
      reporterUserId: reporterId,
      subject: "idem",
      description: "d",
      category: "OTHER",
      idempotencyKey: idem,
      attachmentIds: [att.id],
    });
    const second = await createClubMeldung({
      tenantId,
      reporterUserId: reporterId,
      subject: "changed",
      description: "d",
      category: "OTHER",
      idempotencyKey: idem,
      attachmentIds: [att.id],
    });
    expect(second.created).toBe(false);
    expect(second.meldung.id).toBe(first.meldung.id);

    const links = await prisma.clubMeldungAttachment.findMany({
      where: { communicationAttachmentId: att.id },
    });
    expect(links).toHaveLength(1);
  });

  it("unlinked staged upload is not downloadable via meldung route ACL", async () => {
    const staged = await prisma.communicationAttachment.create({
      data: {
        tenantId,
        storageKey: `staged-${RUN}`,
        originalFilename: "draft.bin",
        sanitizedFilename: "draft.bin",
        contentType: "application/octet-stream",
        sizeBytes: 1,
        checksumSha256: "f".repeat(64),
        sourceType: "UPLOAD",
        lifecycleStatus: "STAGED",
        scanStatus: "PENDING",
        createdByUserId: reporterId,
      },
    });

    const guess = await authorizeClubMeldungAttachmentDownload({
      tenantId,
      actorUserId: handlerId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
      clubMeldungAttachmentId: staged.id,
    });
    expect(guess.ok).toBe(false);

    const linkedCase = await createClubMeldung({
      tenantId,
      reporterUserId: reporterId,
      subject: "with att",
      description: "d",
      category: "OTHER",
      idempotencyKey: `with-att-${RUN}`,
      attachmentIds: [staged.id],
    });
    const assigned = await assignClubMeldung({
      tenantId,
      meldungId: linkedCase.meldung.id,
      actorUserId: handlerId,
      accountableUserId: handlerId,
      expectedVersion: linkedCase.meldung.version,
    });
    const link = await prisma.clubMeldungAttachment.findFirst({
      where: { meldungId: assigned.id },
    });
    expect(link).toBeTruthy();

    const unrelated = await authorizeClubMeldungAttachmentDownload({
      tenantId,
      actorUserId: otherReporterId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_SUBMIT],
      clubMeldungAttachmentId: link!.id,
    });
    expect(unrelated.ok).toBe(false);
  });

  it("collaborator listing does not grant mutation without meldungen.handle", async () => {
    const created = await createClubMeldung({
      tenantId,
      reporterUserId: reporterId,
      subject: "collab",
      description: "d",
      category: "OTHER",
      idempotencyKey: `collab-${RUN}`,
    });
    await prisma.clubMeldungCollaborator.create({
      data: {
        meldungId: created.meldung.id,
        userId: collabOnlyId,
        addedByUserId: handlerId,
      },
    });

    const meldung = { accountableUserId: handlerId, reporterUserId: reporterId };
    expect(
      canMutateMeldungInternal(meldung, {
        actorUserId: collabOnlyId,
        permissionKeys: [PERMISSIONS.MELDUNGEN_SUBMIT],
        collaboratorUserIds: [collabOnlyId],
      }),
    ).toBe(false);

    expect(
      canViewMeldungInternal(meldung, {
        actorUserId: collabOnlyId,
        permissionKeys: [PERMISSIONS.MELDUNGEN_SUBMIT],
        collaboratorUserIds: [collabOnlyId],
      }),
    ).toBe(false);

    expect(
      canMutateMeldungInternal(meldung, {
        actorUserId: collabOnlyId,
        permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
        collaboratorUserIds: [collabOnlyId],
      }),
    ).toBe(true);
  });
});