/**
 * SCE-SELECTOR-02R5 — AND composition activation freezes RequirementRecipient snapshot.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import {
  activateRequirement,
  createRequirementDraft,
  setRequirementDraftAudienceSelectors,
} from "../requirement-service";
import {
  cleanupRequirementFixture,
  createRequirementTestPerson,
  createRequirementTestTenant,
  createRequirementTestUser,
} from "./test-helpers";

const hasSafeTestDb = Boolean(process.env.TEST_DATABASE_URL?.trim());

describe.skipIf(!hasSafeTestDb)("SCE-SELECTOR-02R5 AND composition activation snapshot", () => {
  const fixture = {
    tenantIds: [] as string[],
    userIds: [] as string[],
    personIds: [] as string[],
    orgUnitIds: [] as string[],
    roleIds: [] as string[],
    requirementIds: [] as string[],
  };

  beforeAll(() => {
    createSafeTestPrismaClient();
  });

  afterAll(async () => {
    await cleanupRequirementFixture(fixture);
  });

  function managerCtx(tenantId: string, userId: string) {
    return {
      tenantId,
      userId,
      permissionKeys: [
        PERMISSIONS.REQUIREMENTS_CREATE,
        PERMISSIONS.REQUIREMENTS_MANAGE,
        PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE,
      ],
    };
  }

  it("Trainer AND Kinderfussball resolves intersection, then membership changes do not alter recipients", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const tenant = await createRequirementTestTenant("r5-and");
    const manager = await createRequirementTestUser("r5-and-mgr");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id);

    const shared = await createRequirementTestPerson(tenant.id, "shared");
    const orgOnly = await createRequirementTestPerson(tenant.id, "org-only");
    const roleOnly = await createRequirementTestPerson(tenant.id, "role-only");
    fixture.personIds.push(shared.id, orgOnly.id, roleOnly.id);

    const orgUnit = await prisma.orgUnit.create({
      data: {
        tenantId: tenant.id,
        key: `kf-and-${Date.now()}`,
        name: "Kinderfussball AND fixture",
        status: "ACTIVE",
      },
    });
    fixture.orgUnitIds.push(orgUnit.id);

    await prisma.orgUnitMembership.createMany({
      data: [
        { tenantId: tenant.id, orgUnitId: orgUnit.id, personId: shared.id, status: "ACTIVE" },
        { tenantId: tenant.id, orgUnitId: orgUnit.id, personId: orgOnly.id, status: "ACTIVE" },
      ],
    });

    const roleUserShared = await createRequirementTestUser("r5-shared-role");
    const roleUserRoleOnly = await createRequirementTestUser("r5-role-only");
    fixture.userIds.push(roleUserShared.id, roleUserRoleOnly.id);

    await prisma.tenantMembership.createMany({
      data: [
        { tenantId: tenant.id, userId: roleUserShared.id, isActive: true },
        { tenantId: tenant.id, userId: roleUserRoleOnly.id, isActive: true },
      ],
    });

    const sharedRolePerson = await createRequirementTestPerson(
      tenant.id,
      "shared-role",
      roleUserShared.id,
    );
    const roleOnlyPerson = await createRequirementTestPerson(
      tenant.id,
      "role-only-linked",
      roleUserRoleOnly.id,
    );
    fixture.personIds.push(sharedRolePerson.id, roleOnlyPerson.id);

    await prisma.orgUnitMembership.create({
      data: {
        tenantId: tenant.id,
        orgUnitId: orgUnit.id,
        personId: sharedRolePerson.id,
        status: "ACTIVE",
      },
    });

    const role = await prisma.role.create({
      data: {
        key: `trainer-and-${Date.now()}`,
        name: "Trainer AND fixture",
        scope: "TENANT",
        tenantId: tenant.id,
      },
    });
    fixture.roleIds.push(role.id);

    await prisma.userRole.createMany({
      data: [
        { userId: roleUserShared.id, roleId: role.id, tenantId: tenant.id },
        { userId: roleUserRoleOnly.id, roleId: role.id, tenantId: tenant.id },
      ],
    });

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "AND composition requirement" });
    fixture.requirementIds.push(draft.id);

    await setRequirementDraftAudienceSelectors(ctx, draft.id, {
      composition: {
        version: 1,
        conditions: [
          { term: { type: "ROLE", id: role.id } },
          { connector: "AND", term: { type: "ORG_UNIT", id: orgUnit.id } },
        ],
        excludePersonIds: [],
      },
    });

    await activateRequirement(ctx, draft.id);

    const recipients = await prisma.requirementRecipient.findMany({
      where: { requirementId: draft.id },
      select: { subjectPersonId: true },
    });
    expect(recipients.map((r) => r.subjectPersonId).sort()).toEqual([sharedRolePerson.id].sort());

    await prisma.orgUnitMembership.deleteMany({
      where: { orgUnitId: orgUnit.id, personId: sharedRolePerson.id },
    });
    await prisma.userRole.deleteMany({ where: { userId: roleUserShared.id, roleId: role.id } });

    const afterMutation = await prisma.requirementRecipient.findMany({
      where: { requirementId: draft.id },
      select: { subjectPersonId: true },
    });
    expect(afterMutation.map((r) => r.subjectPersonId).sort()).toEqual([sharedRolePerson.id].sort());
  });
});
