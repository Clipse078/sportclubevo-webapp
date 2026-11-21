/**
 * SCE public reference — disposable Postgres only (TEST_DATABASE_URL).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ClubMeldungCategory,
  ClubMeldungStatus,
  ClubStrategyScopeType,
  type PrismaClient,
} from "@prisma/client";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import {
  allocateScePublicNumber,
  formatScePublicReference,
  parseScePublicReference,
  scePublicReferenceFromNumber,
} from "../sce-public-reference";
import { lookupScePublicReference } from "../sce-public-reference-lookup";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";

const RUN = `sce-ref-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function createTenant(client: PrismaClient, key: string) {
  return client.tenant.create({
    data: { key: `${key}-${RUN}`, name: key, timezone: "Europe/Zurich" },
  });
}

describe("SCE public reference (disposable Postgres)", () => {
  let prisma: PrismaClient;
  let pool: ReturnType<typeof createSafeTestPrismaClient>["pool"];
  let tenantAId = "";
  let tenantBId = "";
  let viewerAId: string;
  let viewerBId: string;
  let outsiderId: string;

  beforeAll(async () => {
    assertSafeTestDatabase();
    ({ prisma, pool } = createSafeTestPrismaClient());

    const tenantA = await createTenant(prisma, "tenant-a");
    const tenantB = await createTenant(prisma, "tenant-b");
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const userA = await prisma.user.create({
      data: {
        email: `viewer-a-${RUN}@fixture.local`,
        passwordHash: "x",
        firstName: "Viewer",
        lastName: "A",
        tenantId: tenantAId,
      },
    });
    const userB = await prisma.user.create({
      data: {
        email: `viewer-b-${RUN}@fixture.local`,
        passwordHash: "x",
        firstName: "Viewer",
        lastName: "B",
        tenantId: tenantBId,
      },
    });
    const outsider = await prisma.user.create({
      data: {
        email: `outsider-${RUN}@fixture.local`,
        passwordHash: "x",
        firstName: "Out",
        lastName: "Side",
        tenantId: tenantAId,
      },
    });
    viewerAId = userA.id;
    viewerBId = userB.id;
    outsiderId = outsider.id;

    for (const [tenantId, userId] of [
      [tenantAId, viewerAId],
      [tenantBId, viewerBId],
    ] as const) {
      await prisma.tenantMembership.create({ data: { tenantId, userId, isActive: true } });
    }
    await prisma.tenantMembership.create({
      data: { tenantId: tenantAId, userId: outsiderId, isActive: true },
    });
  });

  afterAll(async () => {
    if (!tenantAId || !tenantBId) {
      await pool?.end();
      return;
    }
    await prisma.clubMeldung.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.task.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.target.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.clubStrategy.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantScePublicNumberSequence.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await pool.end();
  });

  it("formats references beyond SCE-999999 without truncation", () => {
    expect(formatScePublicReference(1_000_000)).toBe("SCE-1000000");
    expect(parseScePublicReference("SCE-1000000")).toEqual({ sequenceNumber: 1_000_000 });
  });

  it("allocates one interleaved tenant-wide sequence per tenant across four kinds", async () => {
    const numbersA: number[] = [];
    await prisma.$transaction(async (tx) => {
      numbersA.push(await allocateScePublicNumber(tx, tenantAId));
      const strategy = await tx.clubStrategy.create({
        data: {
          tenantId: tenantAId,
          scePublicNumber: numbersA[0],
          scopeType: ClubStrategyScopeType.CLUB,
          title: `S ${RUN}`,
        },
      });
      numbersA.push(await allocateScePublicNumber(tx, tenantAId));
      await tx.target.create({
        data: {
          tenantId: tenantAId,
          scePublicNumber: numbersA[1],
          title: `T ${RUN}`,
        },
      });
      numbersA.push(await allocateScePublicNumber(tx, tenantAId));
      await tx.task.create({
        data: {
          tenantId: tenantAId,
          scePublicNumber: numbersA[2],
          title: `Task ${RUN}`,
        },
      });
      numbersA.push(await allocateScePublicNumber(tx, tenantAId));
      await tx.clubMeldung.create({
        data: {
          tenantId: tenantAId,
          scePublicNumber: numbersA[3],
          caseNumber: `M-${RUN}-A`,
          subject: `Meldung ${RUN}`,
          description: "x",
          category: ClubMeldungCategory.DAMAGE_OR_PROBLEM,
          reporterUserId: viewerAId,
          status: ClubMeldungStatus.RECEIVED,
        },
      });
      expect(strategy.id).toBeTruthy();
    });

    expect(numbersA).toEqual([1, 2, 3, 4]);
    expect(new Set(numbersA).size).toBe(4);

    const numbersB: number[] = [];
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < 2; i++) {
        const n = await allocateScePublicNumber(tx, tenantBId);
        numbersB.push(n);
        await tx.task.create({
          data: {
            tenantId: tenantBId,
            scePublicNumber: n,
            title: `B task ${i} ${RUN}`,
          },
        });
      }
    });
    expect(numbersB).toEqual([1, 2]);
  });

  it("survives concurrent allocations without duplicate numbers", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        prisma.$transaction(async (tx) => {
          const n = await allocateScePublicNumber(tx, tenantAId);
          await tx.task.create({
            data: {
              tenantId: tenantAId,
              scePublicNumber: n,
              title: `Concurrent ${n} ${RUN}`,
            },
          });
          return n;
        }),
      ),
    );
    expect(results.length).toBe(8);
    expect(new Set(results).size).toBe(8);
  });

  it("does not reuse numbers after delete", async () => {
    const created = await prisma.$transaction(async (tx) => {
      const n = await allocateScePublicNumber(tx, tenantAId);
      const row = await tx.target.create({
        data: { tenantId: tenantAId, scePublicNumber: n, title: `Delete me ${RUN}` },
        select: { id: true, scePublicNumber: true },
      });
      return row;
    });
    const ref = scePublicReferenceFromNumber(created.scePublicNumber)!;
    await prisma.target.delete({ where: { id: created.id } });

    const next = await prisma.$transaction(async (tx) => allocateScePublicNumber(tx, tenantAId));
    expect(next).toBeGreaterThan(created.scePublicNumber!);
    expect(ref).toBe(formatScePublicReference(created.scePublicNumber!));
  });

  it("backfill is idempotent when numbers already exist", async () => {
    const tenantId = tenantAId;
    const legacyStrategy = await prisma.clubStrategy.create({
      data: {
        tenantId,
        title: `Legacy ${RUN}`,
        scopeType: ClubStrategyScopeType.CLUB,
        createdAt: new Date("2020-01-01"),
      },
    });
    const existingNumber = 99_001;
    await prisma.$transaction(async (tx) => {
      await tx.tenantScePublicNumberSequence.upsert({
        where: { tenantId },
        create: { tenantId, nextNumber: existingNumber + 1 },
        update: { nextNumber: existingNumber + 1 },
      });
      await tx.clubStrategy.update({
        where: { id: legacyStrategy.id },
        data: { scePublicNumber: existingNumber },
      });
    });

    const before = await prisma.clubStrategy.findUnique({
      where: { id: legacyStrategy.id },
      select: { scePublicNumber: true },
    });
    expect(before?.scePublicNumber).toBe(existingNumber);

    // Second assign attempt must not overwrite.
    await prisma.clubStrategy.updateMany({
      where: { tenantId, scePublicNumber: null },
      data: { scePublicNumber: existingNumber + 5 },
    });
    const after = await prisma.clubStrategy.findUnique({
      where: { id: legacyStrategy.id },
      select: { scePublicNumber: true },
    });
    expect(after?.scePublicNumber).toBe(existingNumber);
  });

  it("resolves acceptance-style caseNumber without scePublicNumber", async () => {
    const legacyOnly = `7${RUN.replace(/\D/g, "").slice(-5).padStart(5, "0")}01`;
    const { ref } = await prisma.$transaction(async (tx) => {
      const row = await tx.clubMeldung.create({
        data: {
          tenantId: tenantAId,
          caseNumber: legacyOnly,
          subject: `Acceptance-style ${RUN}`,
          description: "x",
          category: ClubMeldungCategory.DAMAGE_OR_PROBLEM,
          reporterUserId: viewerAId,
          status: ClubMeldungStatus.RECEIVED,
        },
        select: { caseNumber: true },
      });
      return { ref: row.caseNumber };
    });

    const actor: ActorContext = {
      tenantId: tenantAId,
      userId: viewerAId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_VIEW_ALL, PERMISSIONS.MELDUNGEN_SUBMIT],
      roleKeys: [],
      teamIds: [],
      personId: null,
      orgUnitIds: [],
    };
    const hit = await lookupScePublicReference(actor, ref);
    expect(hit?.kind).toBe("meldung");
    expect(hit?.publicReference).toBe(legacyOnly);
    expect(hit?.legacyAnliegenCaseNumber).toBe(true);
  });

  it("resolves legacy caseNumber when SCE parse fails", async () => {
    const legacyCase = `M-2026-${RUN.slice(-6)}`;
    const { ref } = await prisma.$transaction(async (tx) => {
      const n = await allocateScePublicNumber(tx, tenantAId);
      const row = await tx.clubMeldung.create({
        data: {
          tenantId: tenantAId,
          scePublicNumber: n,
          caseNumber: legacyCase,
          subject: `Legacy case ${RUN}`,
          description: "x",
          category: ClubMeldungCategory.DAMAGE_OR_PROBLEM,
          reporterUserId: viewerAId,
          status: ClubMeldungStatus.RECEIVED,
        },
        select: { id: true, caseNumber: true },
      });
      return { ref: row.caseNumber };
    });

    const actor: import("@/lib/visibility/actor-context").ActorContext = {
      tenantId: tenantAId,
      userId: viewerAId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_VIEW_ALL, PERMISSIONS.MELDUNGEN_SUBMIT],
      roleKeys: [],
      teamIds: [],
      personId: null,
      orgUnitIds: [],
    };
    const byLegacy = await lookupScePublicReference(actor, ref);
    expect(byLegacy?.kind).toBe("meldung");
    expect(byLegacy?.legacyAnliegenCaseNumber).toBe(false);
    expect(parseScePublicReference(ref)).toBeNull();
  });

  it("resolves Anliegen references with permission-aware internal lookup", async () => {
    const { meldungId, ref } = await prisma.$transaction(async (tx) => {
      const n = await allocateScePublicNumber(tx, tenantAId);
      const row = await tx.clubMeldung.create({
        data: {
          tenantId: tenantAId,
          scePublicNumber: n,
          caseNumber: `M-${RUN}-LOOKUP`,
          subject: `Lookup ${RUN}`,
          description: "internal",
          category: ClubMeldungCategory.DAMAGE_OR_PROBLEM,
          reporterUserId: viewerAId,
          status: ClubMeldungStatus.RECEIVED,
        },
        select: { id: true, scePublicNumber: true },
      });
      return {
        meldungId: row.id,
        ref: scePublicReferenceFromNumber(row.scePublicNumber)!,
      };
    });

    const handlerActor: ActorContext = {
      tenantId: tenantAId,
      userId: viewerAId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_VIEW_ALL, PERMISSIONS.MELDUNGEN_HANDLE],
      roleKeys: [],
      teamIds: [],
      personId: null,
      orgUnitIds: [],
    };
    const found = await lookupScePublicReference(handlerActor, ref);
    expect(found?.kind).toBe("meldung");
    expect(found?.id).toBe(meldungId);

    const outsiderActor: ActorContext = {
      tenantId: tenantAId,
      userId: outsiderId,
      permissionKeys: [PERMISSIONS.MELDUNGEN_SUBMIT],
      roleKeys: [],
      teamIds: [],
      personId: null,
      orgUnitIds: [],
    };
    const denied = await lookupScePublicReference(outsiderActor, ref);
    expect(denied).toBeNull();
  });
});