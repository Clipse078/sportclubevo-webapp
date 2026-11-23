/**
 * SCE tenant-wide public references — Aufgabe integration (disposable Postgres only).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SceTenantPublicRecordKind, type PrismaClient } from "@prisma/client";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { createTask } from "../task-service";
import type { TaskServiceContext } from "../types";
import { lookupTenantTaskReference } from "../sce-tenant-task-reference-lookup";
import { lookupScePublicReference } from "@/lib/club-development/sce-public-reference-lookup";
import { formatScePublicReference } from "@/lib/club-development/sce-public-reference";
import {
  allocateTenantPublicNumber,
  registerTenantPublicNumberLedger,
} from "@/lib/tenant-public-reference/sce-tenant-public-number-allocation";

const RUN = `tenant-public-ref-${Date.now()}`;

function serviceCtx(
  tenantId: string,
  userId: string,
  shortCode: string | null,
  perms: string[] = [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE],
): TaskServiceContext {
  return {
    tenantId,
    userId,
    tenantPublicReferenceShortCode: shortCode,
    permissionKeys: perms,
    auth: {
      memberOrgUnitIds: [],
      permissionReadOrgUnitIds: [],
      permissionManageOrgUnitIds: [],
    },
  };
}

function actor(
  tenantId: string,
  userId: string,
  perms: string[] = [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE],
): ActorContext {
  return { tenantId, userId, permissionKeys: perms };
}

describe("tenant public references — Aufgabe (disposable Postgres)", () => {
  let prisma: PrismaClient;
  let pool: ReturnType<typeof createSafeTestPrismaClient>["pool"];
  let tenantAId = "";
  let tenantBId = "";
  let managerAId = "";
  let deniedAId = "";

  beforeAll(async () => {
    assertSafeTestDatabase();
    ({ prisma, pool } = createSafeTestPrismaClient());

    const [tenantA, tenantB] = await Promise.all([
      prisma.tenant.create({
        data: {
          key: `fca-${RUN}`,
          name: "FCA Fixture",
          timezone: "Europe/Zurich",
          publicReferenceShortCode: "FCA",
        },
      }),
      prisma.tenant.create({
        data: {
          key: `fcb-${RUN}`,
          name: "FCB Fixture",
          timezone: "Europe/Zurich",
          publicReferenceShortCode: "FCB",
        },
      }),
    ]);
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const [managerA, managerB, deniedA] = await Promise.all([
      prisma.user.create({
        data: {
          email: `mgr-a-${RUN}@fixture.local`,
          passwordHash: "x",
          firstName: "Mgr",
          lastName: "A",
          tenantId: tenantAId,
        },
      }),
      prisma.user.create({
        data: {
          email: `mgr-b-${RUN}@fixture.local`,
          passwordHash: "x",
          firstName: "Mgr",
          lastName: "B",
          tenantId: tenantBId,
        },
      }),
      prisma.user.create({
        data: {
          email: `denied-a-${RUN}@fixture.local`,
          passwordHash: "x",
          firstName: "Denied",
          lastName: "A",
          tenantId: tenantAId,
        },
      }),
    ]);
    managerAId = managerA.id;

    for (const [tenantId, userId] of [
      [tenantAId, managerAId],
      [tenantBId, managerB.id],
      [tenantAId, deniedA.id],
    ] as const) {
      await prisma.tenantMembership.create({ data: { tenantId, userId, isActive: true } });
    }
    deniedAId = deniedA.id;
  });

  afterAll(async () => {
    if (tenantAId && tenantBId) {
      await prisma.sceTenantPublicNumberLedger.deleteMany({
        where: { tenantId: { in: [tenantAId, tenantBId] } },
      });
      await prisma.task.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.sceTenantPublicNumberSequence.deleteMany({
        where: { tenantId: { in: [tenantAId, tenantBId] } },
      });
    }
    await pool?.end();
  });

  it("rejects duplicate tenant codes case-insensitively", async () => {
    await expect(
      prisma.tenant.create({
        data: {
          key: `dup-${RUN}`,
          name: "Dup",
          timezone: "Europe/Zurich",
          publicReferenceShortCode: "fca",
        },
      }),
    ).rejects.toThrow();
  });

  it("shares one sequence per tenant so FCA-123 is unique across record kinds", async () => {
    const reserved = { n: 0n };
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < 122; i++) await allocateTenantPublicNumber(tx, tenantAId);
      const slot = await allocateTenantPublicNumber(tx, tenantAId);
      reserved.n = slot!.tenantPublicNumber;
      await registerTenantPublicNumberLedger(tx, {
        tenantId: tenantAId,
        tenantPublicNumber: slot!.tenantPublicNumber,
        recordKind: SceTenantPublicRecordKind.TASK,
        entityId: `placeholder-task-${RUN}`,
      });
    });
    expect(reserved.n).toBe(123n);

    const ctx = serviceCtx(tenantAId, managerAId, "FCA");
    const created = await createTask(ctx, { title: "Next slot" });
    expect(created.publicReference).toBe("FCA-124");
  });

  it("two tenants can both issue suffix 123", async () => {
    let fca = 0n;
    let fcb = 0n;
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < 122; i++) await allocateTenantPublicNumber(tx, tenantBId);
      fcb = (await allocateTenantPublicNumber(tx, tenantBId))!.tenantPublicNumber;
    });
    expect(fcb).toBe(123n);
  });

  it("blocks cross-tenant prefix lookup", async () => {
    const ctx = serviceCtx(tenantAId, managerAId, "FCA");
    await createTask(ctx, { title: "Cross guard" });
    const hit = await lookupTenantTaskReference(actor(tenantAId, managerAId), "FCB-1");
    expect(hit).toBeNull();
  });

  it("legacy SCE lookup still resolves tasks", async () => {
    const ctx = serviceCtx(tenantAId, managerAId, "FCA");
    const created = await createTask(ctx, { title: "Legacy lookup" });
    const row = await prisma.task.findFirstOrThrow({ where: { id: created.id } });
    const ref = formatScePublicReference(row.scePublicNumber!);
    const hit = await lookupScePublicReference(actor(tenantAId, managerAId), ref);
    expect(hit?.kind).toBe("task");
    expect(hit?.id).toBe(created.id);
  });

  it("denies lookup without task read permission", async () => {
    const ctx = serviceCtx(tenantAId, managerAId, "FCA");
    const created = await createTask(ctx, { title: "Denied lookup" });
    const hit = await lookupTenantTaskReference(actor(tenantAId, deniedAId, []), created.publicReference!);
    expect(hit).toBeNull();
  });

  it("allocates distinct numbers under concurrent create", async () => {
    const ctx = serviceCtx(tenantAId, managerAId, "FCA");
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => createTask(ctx, { title: `Concurrent ${i}` })),
    );
    const refs = new Set(results.map((r) => r.publicReference));
    expect(refs.size).toBe(5);
    for (const ref of refs) {
      expect(ref).toMatch(/^FCA-\d+$/);
    }
  });
});