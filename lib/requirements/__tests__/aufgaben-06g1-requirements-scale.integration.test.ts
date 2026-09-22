/**
 * AUFGABEN-06G1 — service-level scale test (real DB, isolated fixtures).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  activateRequirement,
  createRequirementDraft,
  getRequirementAggregate,
  setRequirementDraftAudience,
} from "../requirement-service";
import {
  cleanupRequirementFixture,
  createRequirementTestPerson,
  createRequirementTestTenant,
  createRequirementTestUser,
} from "./test-helpers";

const hasSafeTestDb = Boolean(process.env.TEST_DATABASE_URL?.trim());

describe.skipIf(!hasSafeTestDb)("AUFGABEN-06G1 scale activation (500 recipients)", () => {
  let prisma: ReturnType<typeof createSafeTestPrismaClient>["prisma"];
  const fixture: {
    tenantId?: string;
    userId?: string;
    personIds?: string[];
    requirementId?: string;
  } = {};

  beforeAll(() => {
    prisma = createSafeTestPrismaClient().prisma;
  });

  afterAll(async () => {
    await cleanupRequirementFixture({
      tenantIds: fixture.tenantId ? [fixture.tenantId] : [],
      userIds: fixture.userId ? [fixture.userId] : [],
      personIds: fixture.personIds,
      requirementIds: fixture.requirementId ? [fixture.requirementId] : [],
    });
  });

  it(
    "activates 500 explicit recipients with dedupe and bounded aggregate",
    async () => {
      const tenant = await createRequirementTestTenant("scale");
      const manager = await createRequirementTestUser("scale-mgr");
      fixture.tenantId = tenant.id;
      fixture.userId = manager.id;

      const persons = await Promise.all(
        Array.from({ length: 500 }, (_, i) => createRequirementTestPerson(tenant.id, `p${i}`)),
      );
      fixture.personIds = persons.map((p) => p.id);

      const ctx = {
        tenantId: tenant.id,
        userId: manager.id,
        permissionKeys: [
          PERMISSIONS.REQUIREMENTS_CREATE,
          PERMISSIONS.REQUIREMENTS_MANAGE,
          PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE,
        ],
      };

      const draft = await createRequirementDraft(ctx, { title: "Scale test" });
      fixture.requirementId = draft.id;
      await setRequirementDraftAudience(ctx, draft.id, [
        ...persons.map((p) => p.id),
        persons[0]!.id,
      ]);

      const activated = await activateRequirement(ctx, draft.id);
      expect(activated.status).toBe("ACTIVE");

      const recipientCount = await prisma.requirementRecipient.count({
        where: { tenantId: tenant.id, requirementId: draft.id },
      });
      expect(recipientCount).toBe(500);

      const agg = await getRequirementAggregate(ctx, draft.id);
      expect(agg.totalRecipients).toBe(500);
      expect(agg.openCount).toBe(500);
    },
    120_000,
  );
});
