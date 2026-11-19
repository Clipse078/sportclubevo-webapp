/**
 * SCE-ANLIEGEN-01 — disposable Postgres integration (TEST_DATABASE_URL only).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { ClubMeldungServiceError } from "@/lib/club-meldungen/meldung-service";
import {
  assignClubMeldung,
  createClubMeldung,
  markClubMeldungDuplicate,
  postClubMeldungMessage,
  updateClubMeldungStatus,
} from "@/lib/club-meldungen/meldung-service";
import {
  canViewMeldung,
  canViewMeldungInternal,
} from "@/lib/club-meldungen/access";
import { authorizeClubMeldungAttachmentDownload } from "@/lib/club-meldungen/attachment-access";
import { allocateClubMeldungCaseNumber } from "@/lib/club-meldungen/case-number";
import { listClubMeldungReporterTimeline, listClubMeldungen } from "@/lib/club-meldungen/queries";
import { createClubMeldungLinkedTask } from "@/lib/club-meldungen/task-link";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { prisma } from "@/lib/db/prisma";

const RUN = `sce-anliegen-01-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

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

describe("SCE-ANLIEGEN-01 club meldungen (disposable Postgres)", () => {
  let pool: ReturnType<typeof createSafeTestPrismaClient>["pool"];
  let tenantAId: string;
  let tenantBId: string;
  let reporterId: string;
  let handlerAId: string;
  let handlerBId: string;
  let viewerAllId: string;

  beforeAll(async () => {
    assertSafeTestDatabase();
    ({ pool } = createSafeTestPrismaClient());

    const tenantA = await prisma.tenant.create({
      data: { key: `tenant-a-${RUN}`, name: "Anliegen A" },
    });
    const tenantB = await prisma.tenant.create({
      data: { key: `tenant-b-${RUN}`, name: "Anliegen B" },
    });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const reporter = await createMember(prisma, tenantAId, "reporter");
    const handlerA = await createMember(prisma, tenantAId, "handler-a");
    const handlerB = await createMember(prisma, tenantAId, "handler-b");
    const viewerAll = await createMember(prisma, tenantAId, "viewer-all");
    reporterId = reporter.id;
    handlerAId = handlerA.id;
    handlerBId = handlerB.id;
    viewerAllId = viewerAll.id;
  });

  afterAll(async () => {
    const tenants = [tenantAId, tenantBId].filter(Boolean);
    await prisma.clubMeldung.deleteMany({
      where: { reporterUser: { email: { contains: RUN } } },
    });
    for (const tenantId of tenants) {
      await prisma.clubMeldungAttachment.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungCreateIdempotency.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungMessage.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungHistoryEvent.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungCollaborator.deleteMany({
        where: { meldung: { tenantId } },
      });
      await prisma.clubMeldung.deleteMany({ where: { tenantId } });
      await prisma.clubMeldungNumberSequence.deleteMany({ where: { tenantId } });
      await prisma.communicationAttachment.deleteMany({ where: { tenantId } });
      await prisma.notification.deleteMany({ where: { tenantId } });
      await prisma.task.deleteMany({ where: { tenantId } });
      await prisma.tenantMembership.deleteMany({ where: { tenantId } });
      const users = await prisma.user.findMany({
        where: { email: { contains: RUN } },
        select: { id: true },
      });
      await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    }
    await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
    await pool?.end();
  });

  it("allocates six-digit padded case numbers and idempotent create", async () => {
    const idem = `idem-${RUN}`;
    const first = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "Wasser",
      description: "Tropft",
      category: "DAMAGE_OR_PROBLEM",
      idempotencyKey: idem,
    });
    expect(first.created).toBe(true);
    expect(first.meldung.caseNumber).toMatch(/^M-\d{4}-000001$/);

    const retry = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "ignored",
      description: "ignored",
      category: "OTHER",
      idempotencyKey: idem,
    });
    expect(retry.created).toBe(false);
    expect(retry.meldung.id).toBe(first.meldung.id);
    expect(retry.meldung.caseNumber).toBe(first.meldung.caseNumber);
  });

  it("concurrent creates cannot duplicate numbers per tenant", async () => {
    const creates = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        createClubMeldung({
          tenantId: tenantAId,
          reporterUserId: reporterId,
          subject: `Parallel ${index}`,
          description: "x",
          category: "OTHER",
          idempotencyKey: `parallel-${RUN}-${index}`,
        }),
      ),
    );
    const numbers = creates.map((row) => row.meldung.caseNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("allows identical case numbers across tenants", async () => {
    const reporterB = await createMember(prisma, tenantBId, "reporter-b");
    const a = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "cross-a",
      description: "a",
      category: "OTHER",
      idempotencyKey: `cross-a-${RUN}`,
    });
    const b = await createClubMeldung({
      tenantId: tenantBId,
      reporterUserId: reporterB.id,
      subject: "cross-b",
      description: "b",
      category: "OTHER",
      idempotencyKey: `cross-b-${RUN}`,
    });
    expect(a.meldung.caseNumber.endsWith("000001") || b.meldung.caseNumber.endsWith("000001")).toBe(
      true,
    );
  });

  it("preserves case number across assign, resolve and reopen", async () => {
    const created = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "lifecycle",
      description: "d",
      category: "OTHER",
      idempotencyKey: `lifecycle-${RUN}`,
    });
    const caseNumber = created.meldung.caseNumber;
    const assigned = await assignClubMeldung({
      tenantId: tenantAId,
      meldungId: created.meldung.id,
      actorUserId: viewerAllId,
      accountableUserId: handlerAId,
      expectedVersion: created.meldung.version,
    });
    expect(assigned.caseNumber).toBe(caseNumber);

    const resolved = await updateClubMeldungStatus({
      tenantId: tenantAId,
      meldungId: created.meldung.id,
      actorUserId: handlerAId,
      status: "DONE",
      resolutionSummary: "Erledigt",
      expectedVersion: assigned.version,
    });
    expect(resolved.caseNumber).toBe(caseNumber);

    const reopened = await updateClubMeldungStatus({
      tenantId: tenantAId,
      meldungId: created.meldung.id,
      actorUserId: handlerAId,
      status: "IN_PROGRESS",
      reopenReason: "Neues Detail",
      expectedVersion: resolved.version,
    });
    expect(reopened.caseNumber).toBe(caseNumber);
  });

  it("enforces handle visibility boundaries and duplicate link policy", async () => {
    const owned = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "owned",
      description: "d",
      category: "OTHER",
      idempotencyKey: `owned-${RUN}`,
    });
    await assignClubMeldung({
      tenantId: tenantAId,
      meldungId: owned.meldung.id,
      actorUserId: viewerAllId,
      accountableUserId: handlerAId,
      expectedVersion: owned.meldung.version,
    });

    const privateCtx = {
      actorUserId: handlerBId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
    };
    expect(
      canViewMeldungInternal(
        { reporterUserId: reporterId, accountableUserId: handlerAId },
        privateCtx,
      ),
    ).toBe(false);

    const duplicateCandidate = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "dup",
      description: "d",
      category: "OTHER",
      idempotencyKey: `dup-${RUN}`,
    });

    await expect(
      markClubMeldungDuplicate({
        tenantId: tenantAId,
        meldungId: duplicateCandidate.meldung.id,
        duplicateOfId: owned.meldung.id,
        actorUserId: handlerBId,
        expectedVersion: duplicateCandidate.meldung.version,
        permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const linked = await markClubMeldungDuplicate({
      tenantId: tenantAId,
      meldungId: duplicateCandidate.meldung.id,
      duplicateOfId: owned.meldung.id,
      actorUserId: viewerAllId,
      expectedVersion: duplicateCandidate.meldung.version,
      permissionKeys: [PERMISSIONS.MELDUNGEN_VIEW_ALL],
    });
    expect(linked.duplicateOfId).toBe(owned.meldung.id);
  });

  it("excludes internal notes from reporter timeline", async () => {
    const created = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "timeline",
      description: "d",
      category: "OTHER",
      idempotencyKey: `timeline-${RUN}`,
    });

    await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: created.meldung.id,
      actorUserId: handlerAId,
      audience: "INTERNAL_NOTE",
      body: "Intern nur",
    });
    await postClubMeldungMessage({
      tenantId: tenantAId,
      meldungId: created.meldung.id,
      actorUserId: handlerAId,
      audience: "REPORTER_REPLY",
      body: "Öffentliche Antwort",
    });

    const reporterView = await listClubMeldungReporterTimeline(
      tenantAId,
      created.meldung.id,
      false,
    );
    expect(reporterView.messages.map((m) => m.body)).toEqual(["Öffentliche Antwort"]);
  });

  it("rejects inactive membership on create", async () => {
    const inactive = await createMember(prisma, tenantAId, "inactive", false);
    await expect(
      createClubMeldung({
        tenantId: tenantAId,
        reporterUserId: inactive.id,
        subject: "nope",
        description: "d",
        category: "OTHER",
        idempotencyKey: `inactive-${RUN}`,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks attachment download auth without case visibility", async () => {
    const created = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "att",
      description: "d",
      category: "OTHER",
      idempotencyKey: `att-${RUN}`,
    });
    await assignClubMeldung({
      tenantId: tenantAId,
      meldungId: created.meldung.id,
      actorUserId: viewerAllId,
      accountableUserId: handlerAId,
      expectedVersion: created.meldung.version,
    });
    const attachment = await prisma.communicationAttachment.create({
      data: {
        tenantId: tenantAId,
        storageKey: `fixture-${RUN}`,
        originalFilename: "proof.txt",
        sanitizedFilename: "proof.txt",
        contentType: "text/plain",
        sizeBytes: 4,
        checksumSha256: "a".repeat(64),
        sourceType: "UPLOAD",
        lifecycleStatus: "READY",
        scanStatus: "CLEAN",
        createdByUserId: reporterId,
      },
    });
    const link = await prisma.clubMeldungAttachment.create({
      data: {
        tenantId: tenantAId,
        meldungId: created.meldung.id,
        communicationAttachmentId: attachment.id,
        uploadedByUserId: reporterId,
      },
    });

    const denied = await authorizeClubMeldungAttachmentDownload({
      tenantId: tenantAId,
      actorUserId: handlerBId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
      clubMeldungAttachmentId: link.id,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.status).toBe(403);

    const allowed = await authorizeClubMeldungAttachmentDownload({
      tenantId: tenantAId,
      actorUserId: reporterId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_SUBMIT],
      clubMeldungAttachmentId: link.id,
    });
    expect(allowed.ok).toBe(true);
  });

  it("pads beyond six digits when sequence grows", async () => {
    const year = new Date().getUTCFullYear();
    await prisma.$transaction(async (tx) => {
      await tx.clubMeldungNumberSequence.upsert({
        where: { tenantId: tenantAId },
        create: { tenantId: tenantAId, nextNumber: 1_000_002 },
        update: { nextNumber: 1_000_002 },
      });
      const caseNumber = await allocateClubMeldungCaseNumber(tx, tenantAId);
      expect(caseNumber).toBe(`M-${year}-1000002`);
    });
  });

  it("creates linked tasks with CLUB_MELDUNG provenance", async () => {
    const created = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "task",
      description: "d",
      category: "OTHER",
      idempotencyKey: `task-${RUN}`,
    });
    await assignClubMeldung({
      tenantId: tenantAId,
      meldungId: created.meldung.id,
      actorUserId: viewerAllId,
      accountableUserId: handlerAId,
      expectedVersion: created.meldung.version,
    });

    const task = await createClubMeldungLinkedTask(
      {
        tenantId: tenantAId,
        userId: handlerAId,
        permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE, PERMISSIONS.TASKS_CREATE],
      },
      {
        meldungId: created.meldung.id,
        title: "Follow-up",
        access: {
          actorUserId: handlerAId,
          permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
        },
      },
    );
    expect(task.contextType).toBe("CLUB_MELDUNG");
    expect(task.contextId).toBe(created.meldung.id);
  });

  it("lists handler queue without granting read-all", async () => {
    const unassigned = await createClubMeldung({
      tenantId: tenantAId,
      reporterUserId: reporterId,
      subject: "queue",
      description: "d",
      category: "OTHER",
      idempotencyKey: `queue-${RUN}`,
    });
    const triage = await listClubMeldungen({
      tenantId: tenantAId,
      view: "unassigned",
      actorUserId: handlerBId,
      canViewAll: false,
    });
    expect(triage.some((row) => row.id === unassigned.meldung.id)).toBe(true);

    const owned = await assignClubMeldung({
      tenantId: tenantAId,
      meldungId: unassigned.meldung.id,
      actorUserId: handlerBId,
      accountableUserId: handlerAId,
      expectedVersion: unassigned.meldung.version,
    });
    void owned;
    const afterAssign = await listClubMeldungen({
      tenantId: tenantAId,
      view: "unassigned",
      actorUserId: handlerBId,
      canViewAll: false,
    });
    expect(afterAssign.some((row) => row.id === unassigned.meldung.id)).toBe(false);
  });
});