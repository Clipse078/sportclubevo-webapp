/**
 * SCE-COMM-16R1 — real Postgres claim contract (FOR UPDATE SKIP LOCKED).
 *
 * Runs only when TEST_DATABASE_URL points at a disposable local database.
 * Never touches STAGE, Neon, or any remote runtime target.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { claimDuePlatformCommunicationPublicationSchedules } from "@/lib/communication/scheduling/publication-schedule-claim";
import { canRunDbMutatingIntegrationTests } from "@/lib/test/safe-test-database";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";

const describeIntegration = canRunDbMutatingIntegrationTests() ? describe : describe.skip;

describeIntegration("SCE-COMM-16 publication schedule claim (real Postgres)", () => {
  let admin: PrismaClient;
  let pool: { end: () => Promise<void> };
  let tenantId: string;
  let userId: string;
  let communicationId: string;

  const RUN = `comm16-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    const client = createSafeTestPrismaClient();
    admin = client.prisma;
    pool = client.pool;

    const tenant = await admin.tenant.create({
      data: { key: `tenant-${RUN}`, name: "COMM-16 claim test", timezone: "Europe/Zurich" },
      select: { id: true },
    });
    tenantId = tenant.id;

    const user = await admin.user.create({
      data: {
        email: `comm16-${RUN}@example.invalid`,
        passwordHash: "unused",
        firstName: "Test",
        lastName: "Scheduler",
        tenantId,
      },
      select: { id: true },
    });
    userId = user.id;

    const conversation = await admin.platformCommunicationConversation.create({
      data: {
        tenantId,
        contextKind: "ORGANISATION",
        conversationKind: "ORG_GENERAL",
      },
      select: { id: true },
    });

    const communication = await admin.platformCommunication.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        kind: "CAMPAIGN",
        status: "READY",
        contextRef: { kind: "ORGANISATION", tenantId },
        bodyText: "Scheduled body",
        audienceSpecJson: {
          composition: "UNION",
          components: [{ structural: { wholeOrganisation: true } }],
        },
        createdByUserId: userId,
      },
      select: { id: true },
    });
    communicationId = communication.id;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.platformCommunicationPublicationSchedule.deleteMany({ where: { tenantId } });
    await admin.platformCommunication.deleteMany({ where: { tenantId } });
    await admin.platformCommunicationConversation.deleteMany({ where: { tenantId } });
    await admin.user.deleteMany({ where: { tenantId } });
    await admin.tenant.delete({ where: { id: tenantId } });
    await admin.$disconnect();
    await pool.end();
  });

  async function insertSchedule(input: {
    status: "SCHEDULED" | "PROCESSING";
    scheduledAt: Date;
    attemptCount?: number;
    claimedAt?: Date | null;
    leaseExpiresAt?: Date | null;
  }) {
    await admin.platformCommunicationPublicationSchedule.deleteMany({
      where: { communicationId },
    });
    return admin.platformCommunicationPublicationSchedule.create({
      data: {
        tenantId,
        communicationId,
        scheduledAt: input.scheduledAt,
        timezone: "Europe/Zurich",
        status: input.status,
        attemptCount: input.attemptCount ?? 0,
        maxAttempts: 5,
        createdByUserId: userId,
        claimedAt: input.claimedAt ?? null,
        leaseExpiresAt: input.leaseExpiresAt ?? null,
      },
    });
  }

  it("allows exactly one concurrent worker to claim a due SCHEDULED row", async () => {
    const past = new Date(Date.now() - 60_000);
    const schedule = await insertSchedule({ status: "SCHEDULED", scheduledAt: past });

    const clientA = createSafeTestPrismaClient();
    const clientB = createSafeTestPrismaClient();
    const now = new Date();

    try {
      const [rowsA, rowsB] = await Promise.all([
        claimDuePlatformCommunicationPublicationSchedules(clientA.prisma, { now, batchSize: 1 }),
        claimDuePlatformCommunicationPublicationSchedules(clientB.prisma, { now, batchSize: 1 }),
      ]);

      const claimedIds = [...rowsA, ...rowsB].map((row) => row.id);
      const forSchedule = claimedIds.filter((id) => id === schedule.id);
      expect(forSchedule).toHaveLength(1);

      const fresh = await admin.platformCommunicationPublicationSchedule.findUnique({
        where: { id: schedule.id },
      });
      expect(fresh?.status).toBe("PROCESSING");
      expect(fresh?.attemptCount).toBe(1);
    } finally {
      await clientA.prisma.$disconnect();
      await clientB.prisma.$disconnect();
      await clientA.pool.end();
      await clientB.pool.end();
    }
  });

  it("reclaims stale PROCESSING rows without incrementing attemptCount", async () => {
    const past = new Date(Date.now() - 120_000);
    const expiredLease = new Date(Date.now() - 30_000);
    const schedule = await insertSchedule({
      status: "PROCESSING",
      scheduledAt: past,
      attemptCount: 2,
      claimedAt: new Date(Date.now() - 900_000),
      leaseExpiresAt: expiredLease,
    });

    const [claimed] = await claimDuePlatformCommunicationPublicationSchedules(admin, {
      now: new Date(),
      batchSize: 5,
    });

    expect(claimed?.id).toBe(schedule.id);
    expect(claimed?.status).toBe("PROCESSING");
    expect(claimed?.attemptCount).toBe(2);

    const fresh = await admin.platformCommunicationPublicationSchedule.findUnique({
      where: { id: schedule.id },
    });
    expect(fresh?.attemptCount).toBe(2);
    expect(fresh?.leaseExpiresAt && fresh.leaseExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
