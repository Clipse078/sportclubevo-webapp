/**
 * SCE-DESIGN-SYSTEM-10 R4.4 — Anforderungen Verwaltung runtime load repair.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import {
  cleanupRequirementFixture,
  createRequirementTestTenant,
} from "@/lib/requirements/__tests__/test-helpers";
import {
  getRequirementManagementSummary,
  listRequirementManagementItems,
} from "@/lib/requirements/management-service";
import { RequirementForbiddenError } from "@/lib/requirements/errors";
import { buildVerwaltungUnifiedRows } from "@/lib/aufgaben/verwaltung-unified-presentation";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";

const hasSafeTestDb = Boolean(process.env.TEST_DATABASE_URL?.trim());

function readSrc(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function managerCtx(tenantId: string) {
  return {
    tenantId,
    userId: "mgr-r44",
    permissionKeys: [
      PERMISSIONS.REQUIREMENTS_VIEW,
      PERMISSIONS.REQUIREMENTS_MANAGE,
      PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE,
    ],
  };
}

describe("SCE-DESIGN-SYSTEM-10 R4.4 — Anforderungen runtime load", () => {
  it("guardrail — REQUIREMENT_INCLUDE must not list scalar Json fields (Prisma 7 include)", () => {
    const mgmt = readSrc("lib/requirements/management-service.ts");
    const svc = readSrc("lib/requirements/requirement-service.ts");
    expect(mgmt).not.toMatch(/include:[\s\S]*draftAudienceCompositionJson:\s*true/);
    expect(svc).not.toMatch(/REQUIREMENT_INCLUDE[\s\S]*draftAudienceCompositionJson:\s*true/);
  });

  it("G — authorization remains enforced on management queries", async () => {
    await expect(
      getRequirementManagementSummary({
        tenantId: "tenant-a",
        userId: "u",
        permissionKeys: [],
      }),
    ).rejects.toBeInstanceOf(RequirementForbiddenError);
  });

  it("E — unified row builder keeps task rows when requirements input is empty (partial domain)", () => {
    const rows = buildVerwaltungUnifiedRows({
      tasks: [
        {
          task: {
            id: "t1",
            tenantId: "tenant-a",
            title: "Task A",
            description: null,
            status: "OPEN",
            priority: "NORMAL",
            dueAt: null,
            completedAt: null,
            contextType: null,
            contextId: null,
            parentTaskId: null,
            taskSeriesId: null,
            createdByUserId: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            assignees: [],
          },
          parentTask: null,
          subtasks: [],
          progress: { completedCount: 0, totalCount: 0, percent: 0, label: "0 / 0 erledigt" },
          seriesRecurrenceLabel: null,
          context: null,
          expandable: false,
        },
      ],
      requirements: [],
      locale: "de-CH",
      timeZone: "Europe/Zurich",
      taskHref: (id) => `/tasks/${id}`,
      requirementHref: (id) => `/req/${id}`,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("AUFGABE");
  });

  it("Toggle First — no new binary checkboxes", () => {
    expect(SCE_BINARY_CHECKBOX_COUNTS.REMAINING_LEGACY_BINARY_CHECKBOXES).toBe(0);
  });
});

describe.skipIf(!hasSafeTestDb)(
  "SCE-DESIGN-SYSTEM-10 R4.4 — management service integration (real Prisma)",
  () => {
    let prisma: ReturnType<typeof createSafeTestPrismaClient>["prisma"];
    const fixture: { tenantId?: string; requirementIds: string[]; personIds: string[] } = {
      requirementIds: [],
      personIds: [],
    };

    beforeAll(() => {
      prisma = createSafeTestPrismaClient().prisma;
    });

    afterAll(async () => {
      await cleanupRequirementFixture({
        tenantIds: fixture.tenantId ? [fixture.tenantId] : [],
        requirementIds: fixture.requirementIds,
        personIds: fixture.personIds,
      });
    });

    it("A/B/D — summary + list load legacy-shaped requirements together", async () => {
      const tenant = await createRequirementTestTenant("r44-runtime");
      fixture.tenantId = tenant.id;
      const ctx = managerCtx(tenant.id);

      const person = await prisma.person.create({
        data: {
          tenantId: tenant.id,
          firstName: "Legacy",
          lastName: randomUUID().slice(0, 6),
          email: `r44-${randomUUID().slice(0, 8)}@example.test`,
          isActive: true,
        },
      });
      fixture.personIds.push(person.id);

      const requirement = await prisma.requirement.create({
        data: {
          tenantId: tenant.id,
          title: "Historische Anforderung",
          status: "ACTIVE",
          dueAt: null,
          activatedAt: new Date(),
          createdByUserId: null,
          draftAudienceCompositionJson: { version: 2, conditions: [] },
        },
      });
      fixture.requirementIds.push(requirement.id);

      await prisma.requirementRecipient.create({
        data: {
          tenantId: tenant.id,
          requirementId: requirement.id,
          subjectPersonId: person.id,
          resolutionStatus: "OPEN",
        },
      });

      const summary = await getRequirementManagementSummary(ctx);
      expect(summary.active).toBeGreaterThanOrEqual(1);

      const list = await listRequirementManagementItems(ctx, {
        search: "",
        sort: "DEADLINE_ASC",
        status: "ALL",
        deadline: "ALL",
        page: 1,
      });
      expect(list.totalCount).toBeGreaterThanOrEqual(1);
      const item = list.items.find((row) => row.requirement.id === requirement.id);
      expect(item).toBeDefined();
      expect(item?.requirement.dueAt).toBeNull();
      expect(item?.requirement.draftAudienceComposition).toBeNull();
      expect(item?.aggregate?.openCount).toBe(1);

      const unified = buildVerwaltungUnifiedRows({
        tasks: [],
        requirements: list.items,
        locale: "de-CH",
        timeZone: "Europe/Zurich",
        taskHref: (id) => `/tasks/${id}`,
        requirementHref: (id) => `/req/${id}`,
      });
      expect(unified.some((row) => row.kind === "ANFORDERUNG" && row.id === requirement.id)).toBe(
        true,
      );
    });

    it("F — tenant isolation on list query", async () => {
      if (!fixture.tenantId) return;
      const otherTenant = await createRequirementTestTenant("r44-other");
      try {
        const foreign = await prisma.requirement.create({
          data: {
            tenantId: otherTenant.id,
            title: "Foreign",
            status: "ACTIVE",
            activatedAt: new Date(),
          },
        });
        const list = await listRequirementManagementItems(managerCtx(fixture.tenantId!), {
          search: "",
          sort: "DEADLINE_ASC",
          status: "ALL",
          deadline: "ALL",
          page: 1,
        });
        expect(list.items.some((item) => item.requirement.id === foreign.id)).toBe(false);
        await prisma.requirement.delete({ where: { id: foreign.id } });
      } finally {
        await prisma.tenant.delete({ where: { id: otherTenant.id } });
      }
    });
  },
);
