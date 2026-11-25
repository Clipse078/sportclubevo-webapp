/**
 * Tenant-wide public references — Strategie, Ziel, Aufgabe, Anliegen (disposable Postgres).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ClubMeldungCategory,
  ClubMeldungStatus,
  SceTenantPublicRecordKind,
  TargetCategory,
  TargetStatus,
  type PrismaClient,
} from "@prisma/client";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { createTask } from "@/lib/tasks/task-service";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { createClubStrategy } from "@/lib/club-development/club-strategy-service";
import { createClubMeldung } from "@/lib/club-meldungen/meldung-service";
import { lookupScePublicReference } from "@/lib/club-development/sce-public-reference-lookup";
import { lookupTenantPublicRecordReference } from "@/lib/tenant-public-reference/sce-tenant-record-reference-lookup";
import { formatScePublicReference } from "@/lib/club-development/sce-public-reference";

const RUN = `tenant-record-ref-${Date.now()}`;

function taskCtx(
  tenantId: string,
  userId: string,
  shortCode: string | null,
): TaskServiceContext {
  return {
    tenantId,
    userId,
    tenantPublicReferenceShortCode: shortCode,
    permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE],
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
  perms: string[],
): ActorContext {
  return { tenantId, userId, permissionKeys: perms };
}

describe("tenant public references — four record kinds", () => {
  let prisma: PrismaClient;
  let pool: ReturnType<typeof createSafeTestPrismaClient>["pool"];
  let tenantId = "";
  let otherTenantId = "";
  let managerId = "";
  let reporterId = "";
  let deniedId = "";

  beforeAll(async () => {
    assertSafeTestDatabase();
    ({ prisma, pool } = createSafeTestPrismaClient());

    const [tenantA, tenantB] = await Promise.all([
      prisma.tenant.create({
        data: {
          key: `fca-${RUN}`,
          name: "FCA",
          timezone: "Europe/Zurich",
          publicReferenceShortCode: "FCA",
        },
      }),
      prisma.tenant.create({
        data: {
          key: `fcb-${RUN}`,
          name: "FCB",
          timezone: "Europe/Zurich",
          publicReferenceShortCode: "FCB",
        },
      }),
    ]);
    tenantId = tenantA.id;
    otherTenantId = tenantB.id;

    const users = await Promise.all(
      ["mgr", "rep", "denied"].map((role) =>
        prisma.user.create({
          data: {
            email: `${role}-${RUN}@fixture.local`,
            passwordHash: "x",
            firstName: role,
            lastName: "Fixture",
            tenantId,
          },
        }),
      ),
    );
    managerId = users[0]!.id;
    reporterId = users[1]!.id;
    deniedId = users[2]!.id;

    for (const userId of [managerId, reporterId, deniedId]) {
      await prisma.tenantMembership.create({ data: { tenantId, userId, isActive: true } });
    }
  });

  afterAll(async () => {
    if (tenantId) {
      await prisma.sceTenantPublicNumberLedger.deleteMany({ where: { tenantId } });
      await Promise.all([
        prisma.task.deleteMany({ where: { tenantId } }),
        prisma.target.deleteMany({ where: { tenantId } }),
        prisma.clubStrategy.deleteMany({ where: { tenantId } }),
        prisma.clubMeldung.deleteMany({ where: { tenantId } }),
      ]);
    }
    await pool?.end();
  });

  it("allocates mixed record kinds within one tenant sequence", async () => {
    const cdActor = actor(tenantId, managerId, [
      PERMISSIONS.TARGETS_VIEW,
      PERMISSIONS.TARGETS_MANAGE,
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_MANAGE,
    ]);

    const strategy = await createClubStrategy(cdActor, managerId, {
      title: `Strategie ${RUN}`,
      scopeClubWide: true,
    });
    expect(strategy.publicReference).toMatch(/^FCA-\d+$/);

    const target = await prisma.$transaction(async (tx) => {
      const { allocateSceRecordReferenceFields, linkTenantRecordPublicReference } = await import(
        "@/lib/tenant-public-reference/sce-tenant-record-reference-allocation"
      );
      const { resolveTenantPublicReferenceDisplay } = await import(
        "@/lib/tenant-public-reference/sce-tenant-public-reference"
      );
      const refs = await allocateSceRecordReferenceFields(tx, tenantId);
      const row = await tx.target.create({
        data: {
          tenantId,
          scePublicNumber: refs.scePublicNumber,
          tenantPublicNumber: refs.tenantPublicNumber,
          title: `Ziel ${RUN}`,
          category: TargetCategory.SPORTLICHE_ENTWICKLUNG,
          status: TargetStatus.ACTIVE,
          createdByUserId: managerId,
        },
      });
      if (refs.tenantPublicNumber != null) {
        await linkTenantRecordPublicReference(tx, {
          tenantId,
          tenantPublicNumber: refs.tenantPublicNumber,
          recordKind: SceTenantPublicRecordKind.TARGET,
          entityId: row.id,
        });
      }
      return {
        id: row.id,
        publicReference: resolveTenantPublicReferenceDisplay({
          tenantShortCode: "FCA",
          tenantPublicNumber: row.tenantPublicNumber,
          legacyScePublicNumber: row.scePublicNumber,
        }),
      };
    });
    expect(target.publicReference).toMatch(/^FCA-\d+$/);

    const task = await createTask(taskCtx(tenantId, managerId, "FCA"), {
      title: `Aufgabe ${RUN}`,
    });
    expect(task.publicReference).toMatch(/^FCA-\d+$/);

    const meldung = await createClubMeldung({
      tenantId,
      reporterUserId: reporterId,
      subject: `Anliegen ${RUN}`,
      description: "Test",
      category: ClubMeldungCategory.DAMAGE_OR_PROBLEM,
      idempotencyKey: `idem-${RUN}`,
    });
    expect(meldung.publicReference).toMatch(/^FCA-\d+$/);

    const refs = new Set([
      strategy.publicReference,
      target.publicReference,
      task.publicReference,
      meldung.publicReference,
    ]);
    expect(refs.size).toBe(4);

    const strategyLedger = await prisma.sceTenantPublicNumberLedger.findFirst({
      where: { tenantId, recordKind: SceTenantPublicRecordKind.STRATEGY, entityId: strategy.id },
    });
    expect(strategyLedger).not.toBeNull();
  });

  it("resolves tenant references to exactly one kind with permissions", async () => {
    const created = await createTask(taskCtx(tenantId, managerId, "FCA"), {
      title: "Lookup guard",
    });
    const hit = await lookupTenantPublicRecordReference(
      actor(tenantId, managerId, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]),
      created.publicReference!,
    );
    expect(hit?.kind).toBe("task");
    expect(hit?.id).toBe(created.id);

    const denied = await lookupTenantPublicRecordReference(
      actor(tenantId, deniedId, []),
      created.publicReference!,
    );
    expect(denied).toBeNull();

    const crossTenant = await lookupTenantPublicRecordReference(
      actor(otherTenantId, managerId, [PERMISSIONS.TASKS_VIEW]),
      created.publicReference!,
    );
    expect(crossTenant).toBeNull();
  });

  it("keeps legacy SCE lookup after tenant assignment", async () => {
    const created = await createTask(taskCtx(tenantId, managerId, "FCA"), {
      title: "Legacy after tenant",
    });
    const row = await prisma.task.findFirstOrThrow({ where: { id: created.id } });
    const legacyRef = formatScePublicReference(row.scePublicNumber!);
    const hit = await lookupScePublicReference(
      actor(tenantId, managerId, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]),
      legacyRef,
    );
    expect(hit?.kind).toBe("task");
    expect(hit?.id).toBe(created.id);
    expect(hit?.publicReference).toBe(created.publicReference);
  });

  it("resolves Anliegen for reporter and handler contexts", async () => {
    const meldung = await createClubMeldung({
      tenantId,
      reporterUserId: reporterId,
      subject: `Access ${RUN}`,
      description: "x",
      category: ClubMeldungCategory.DAMAGE_OR_PROBLEM,
      idempotencyKey: `access-${RUN}`,
    });

    const reporterHit = await lookupScePublicReference(
      actor(tenantId, reporterId, [PERMISSIONS.MELDUNGEN_SUBMIT]),
      meldung.publicReference!,
    );
    expect(reporterHit?.kind).toBe("meldung");

    const handlerHit = await lookupScePublicReference(
      actor(tenantId, managerId, [PERMISSIONS.MELDUNGEN_VIEW_ALL, PERMISSIONS.MELDUNGEN_HANDLE]),
      meldung.publicReference!,
    );
    expect(handlerHit?.kind).toBe("meldung");
    expect(handlerHit?.id).toBe(meldung.meldung.id);
  });

  it("preserves legacy case-only Anliegen lookup", async () => {
    const legacyCase = `LEG-${RUN}`;
    await prisma.clubMeldung.create({
      data: {
        tenantId,
        caseNumber: legacyCase,
        subject: `Legacy ${RUN}`,
        description: "x",
        category: ClubMeldungCategory.DAMAGE_OR_PROBLEM,
        reporterUserId: reporterId,
        status: ClubMeldungStatus.RECEIVED,
      },
    });
    const hit = await lookupScePublicReference(
      actor(tenantId, managerId, [PERMISSIONS.MELDUNGEN_VIEW_ALL]),
      legacyCase,
    );
    expect(hit?.kind).toBe("meldung");
    expect(hit?.legacyAnliegenCaseNumber).toBe(true);
  });
});