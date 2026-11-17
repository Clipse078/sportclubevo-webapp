/**
 * Regression: setTenantUserRoles must not re-run grant-ceiling delegation on
 * unchanged existing assignments when adding another tenant role.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setTenantUserRoles } from "@/lib/roles/mutations";
import { DelegationForbiddenError } from "@/lib/roles/errors";
import {
  assignUserRoleFixture,
  cleanupTestFixtures,
  createTenantRoleFixture,
  createTestMembership,
  createTestTenant,
  createTestUser,
  ensurePermission,
  prisma,
  uniqueSuffix,
} from "./test-helpers";

const delegationSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/roles/delegation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/roles/delegation")>();
  return {
    ...actual,
    assertTenantDelegationAllowed: (...args: Parameters<typeof actual.assertTenantDelegationAllowed>) => {
      delegationSpy(...args);
      return actual.assertTenantDelegationAllowed(...args);
    },
  };
});

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "setTenantUserRoles — delegation scope (live DB)",
  () => {
  let tenant: { id: string };
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];

  const TEAMS_VIEW = `teams.view-deleg-${uniqueSuffix()}`;
  const USERS_INVITE = `users.invite-deleg-${uniqueSuffix()}`;
  const ROLES_ASSIGN = `roles.assign-deleg-${uniqueSuffix()}`;

  beforeAll(async () => {
    tenant = await createTestTenant("deleg-scope");
    createdTenantIds.push(tenant.id);

    await ensurePermission(TEAMS_VIEW, { module: "TEAMS", scope: "TENANT", grantableByAdmin: true });
    await ensurePermission(USERS_INVITE, { module: "USERS", scope: "TENANT", grantableByAdmin: true });
    await ensurePermission(ROLES_ASSIGN, { module: "ROLES", scope: "TENANT", grantableByAdmin: true });
  });

  afterAll(async () => {
    await cleanupTestFixtures({ tenantIds: createdTenantIds, userIds: createdUserIds });
    await prisma.$disconnect();
  });

  it("delegates only newly added roles, not unchanged high-ceiling roles", async () => {
    delegationSpy.mockClear();

    const actor = await createTestUser("deleg-actor");
    const target = await createTestUser("deleg-target");
    createdUserIds.push(actor.id, target.id);
    await createTestMembership(tenant.id, actor.id, true);
    await createTestMembership(tenant.id, target.id, true);

    const actorRole = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Deleg Actor",
      permissionKeys: [TEAMS_VIEW, ROLES_ASSIGN],
    });
    const elevatedExisting = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Präsident (Pilot) Fixture",
      permissionKeys: [USERS_INVITE],
    });
    const roleToAdd = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Vorstandsmitglied Fixture",
      permissionKeys: [TEAMS_VIEW],
    });

    await assignUserRoleFixture({ userId: actor.id, roleId: actorRole.id, tenantId: tenant.id });
    await assignUserRoleFixture({
      userId: target.id,
      roleId: elevatedExisting.id,
      tenantId: tenant.id,
    });

    const result = await setTenantUserRoles({
      tenantId: tenant.id,
      userId: target.id,
      roleIds: [elevatedExisting.id, roleToAdd.id],
      actorUserId: actor.id,
    });

    expect(result.assigned).toEqual([roleToAdd.name]);
    expect(result.removed).toEqual([]);
    expect(delegationSpy).toHaveBeenCalledTimes(1);
    expect(delegationSpy).toHaveBeenCalledWith(
      expect.objectContaining({ roleIds: [roleToAdd.id] }),
    );

    const rows = await prisma.userRole.findMany({
      where: { userId: target.id, tenantId: tenant.id, orgUnitId: null },
      select: { roleId: true },
    });
    expect(rows.map((r) => r.roleId).sort()).toEqual(
      [elevatedExisting.id, roleToAdd.id].sort(),
    );
  });

  it("allows removing a high-ceiling role without re-delegating its permissions", async () => {
    const actor = await createTestUser("deleg-actor-rem");
    const target = await createTestUser("deleg-target-rem");
    createdUserIds.push(actor.id, target.id);
    await createTestMembership(tenant.id, actor.id, true);
    await createTestMembership(tenant.id, target.id, true);

    const actorRole = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Limited Remover",
      permissionKeys: [TEAMS_VIEW, ROLES_ASSIGN],
    });
    const elevated = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Präsident Rem Fixture",
      permissionKeys: [USERS_INVITE],
    });
    await assignUserRoleFixture({ userId: actor.id, roleId: actorRole.id, tenantId: tenant.id });
    await assignUserRoleFixture({
      userId: target.id,
      roleId: elevated.id,
      tenantId: tenant.id,
    });

    delegationSpy.mockClear();

    const result = await setTenantUserRoles({
      tenantId: tenant.id,
      userId: target.id,
      roleIds: [],
      actorUserId: actor.id,
    });

    expect(result.removed).toEqual([elevated.name]);
    expect(delegationSpy).not.toHaveBeenCalled();
  });

  it("parallel sync calls on different members each enforce delegation (no bypass)", async () => {
    const actor = await createTestUser("deleg-actor-par");
    const targetAllowed = await createTestUser("deleg-target-par-a");
    const targetForbidden = await createTestUser("deleg-target-par-b");
    createdUserIds.push(actor.id, targetAllowed.id, targetForbidden.id);
    await createTestMembership(tenant.id, actor.id, true);
    await createTestMembership(tenant.id, targetAllowed.id, true);
    await createTestMembership(tenant.id, targetForbidden.id, true);

    const actorRole = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Parallel Actor",
      permissionKeys: [TEAMS_VIEW, ROLES_ASSIGN],
    });
    const allowedRole = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Parallel Allowed",
      permissionKeys: [TEAMS_VIEW],
    });
    const forbiddenRole = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Parallel Forbidden",
      permissionKeys: [USERS_INVITE],
    });
    await assignUserRoleFixture({ userId: actor.id, roleId: actorRole.id, tenantId: tenant.id });

    const [allowedOutcome, forbiddenOutcome] = await Promise.allSettled([
      setTenantUserRoles({
        tenantId: tenant.id,
        userId: targetAllowed.id,
        roleIds: [allowedRole.id],
        actorUserId: actor.id,
      }),
      setTenantUserRoles({
        tenantId: tenant.id,
        userId: targetForbidden.id,
        roleIds: [forbiddenRole.id],
        actorUserId: actor.id,
      }),
    ]);

    expect(allowedOutcome.status).toBe("fulfilled");
    expect(forbiddenOutcome.status).toBe("rejected");
    if (forbiddenOutcome.status === "rejected") {
      expect(forbiddenOutcome.reason).toBeInstanceOf(DelegationForbiddenError);
    }

    const allowedRows = await prisma.userRole.findMany({
      where: { userId: targetAllowed.id, tenantId: tenant.id, orgUnitId: null },
      select: { roleId: true },
    });
    expect(allowedRows.map((r) => r.roleId)).toEqual([allowedRole.id]);

    const forbiddenRows = await prisma.userRole.findMany({
      where: { userId: targetForbidden.id, tenantId: tenant.id, orgUnitId: null },
    });
    expect(forbiddenRows).toHaveLength(0);
  });

  it("still rejects adding a role above the actor grant ceiling", async () => {
    const actor = await createTestUser("deleg-actor-block");
    const target = await createTestUser("deleg-target-block");
    createdUserIds.push(actor.id, target.id);
    await createTestMembership(tenant.id, actor.id, true);
    await createTestMembership(tenant.id, target.id, true);

    const actorRole = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Limited Actor",
      permissionKeys: [TEAMS_VIEW, ROLES_ASSIGN],
    });
    const forbiddenRole = await createTenantRoleFixture({
      tenantId: tenant.id,
      name: "Elevated New",
      permissionKeys: [USERS_INVITE],
    });
    await assignUserRoleFixture({ userId: actor.id, roleId: actorRole.id, tenantId: tenant.id });

    await expect(
      setTenantUserRoles({
        tenantId: tenant.id,
        userId: target.id,
        roleIds: [forbiddenRole.id],
        actorUserId: actor.id,
      }),
    ).rejects.toBeInstanceOf(DelegationForbiddenError);

    const rows = await prisma.userRole.findMany({
      where: { userId: target.id, tenantId: tenant.id, orgUnitId: null },
    });
    expect(rows).toHaveLength(0);
  });
  },
);