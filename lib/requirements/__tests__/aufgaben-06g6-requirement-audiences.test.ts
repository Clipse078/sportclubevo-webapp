/**
 * AUFGABEN-06G6 — Requirement audience expansion contract tests (A01–A20).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import {
  canRespondToRequirementRecipient,
} from "../requirement-authorization";
import { computeRequirementAggregate } from "../requirement-aggregate";
import { buildRequirementPersonalActionId } from "@/lib/personal-actions/identity";
import {
  resolveRequirementAudiencePersonIdsFromDraftRows,
  resolveRequirementAudiencePersonIdsFromSnapshot,
} from "../requirement-audience";
import {
  activateRequirement,
  createRequirementDraft,
  getRequirementAggregate,
  setRequirementDraftAudience,
  setRequirementDraftAudienceSelectors,
} from "../requirement-service";
import * as requirementPlatform from "../platform";
import {
  cleanupRequirementFixture,
  createRequirementTestPerson,
  createRequirementTestTenant,
  createRequirementTestUser,
} from "./test-helpers";
import { RequirementTenantMismatchError } from "../errors";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const hasSafeTestDb = Boolean(process.env.TEST_DATABASE_URL?.trim());

describe("AUFGABEN-06G6 — static contracts", () => {
  it("A19/A20 — platform exports canonical audience APIs without React", () => {
    expect(typeof requirementPlatform.resolveRequirementAudiencePersonIds).toBe("function");
    expect(typeof requirementPlatform.setRequirementDraftAudienceSelectors).toBe("function");
    expect(read("lib/requirements/platform.ts")).not.toMatch(/from \"react\"/);
    expect(read("lib/notifications/requirement-deadline-processor.ts")).not.toMatch(
      /resolveRequirementAudiencePersonIds/,
    );
    expect(read("lib/notifications/requirement-deadline-processor.ts")).toMatch(
      /requirementRecipient\.findMany/,
    );
  });

  it("A01 — EXPLICIT_PERSONS dedupe unchanged", () => {
    expect(
      resolveRequirementAudiencePersonIdsFromDraftRows([
        { personId: "p1" },
        { personId: "p2" },
        { personId: "p1" },
      ]),
    ).toEqual(["p1", "p2"]);
  });

  it("A07 — ROLE_AUDIENCE does not grant response rights for other subjects", () => {
    const trainerCtx = {
      tenantId: "tenant-a",
      userId: "trainer-user",
      permissionKeys: [PERMISSIONS.REQUIREMENTS_MANAGE],
    };
    expect(
      canRespondToRequirementRecipient(
        trainerCtx,
        {
          tenantId: "tenant-a",
          requirementId: "req",
          subjectPersonId: "player-person",
          removedAt: null,
        },
        [],
      ),
    ).toBe(false);
  });
});

describe.skipIf(!hasSafeTestDb)("AUFGABEN-06G6 — audience integration (real DB)", () => {
  let prisma: ReturnType<typeof createSafeTestPrismaClient>["prisma"];
  const fixture: {
    tenantIds: string[];
    userIds: string[];
    personIds: string[];
    requirementIds: string[];
    teamIds: string[];
    seasonIds: string[];
    orgUnitIds: string[];
    roleIds: string[];
    targetGroupIds: string[];
  } = {
    tenantIds: [],
    userIds: [],
    personIds: [],
    requirementIds: [],
    teamIds: [],
    seasonIds: [],
    orgUnitIds: [],
    roleIds: [],
    targetGroupIds: [],
  };

  beforeAll(() => {
    prisma = createSafeTestPrismaClient().prisma;
  });

  afterAll(async () => {
    for (const requirementId of fixture.requirementIds) {
      await prisma.requirementRecipient.deleteMany({ where: { requirementId } });
    }
    await cleanupRequirementFixture({
      tenantIds: fixture.tenantIds,
      userIds: fixture.userIds,
      personIds: fixture.personIds,
      requirementIds: fixture.requirementIds,
    });
    if (fixture.teamIds.length) {
      await prisma.playerSquadMember.deleteMany({ where: { teamSeason: { teamId: { in: fixture.teamIds } } } });
      await prisma.trainerTeamMember.deleteMany({ where: { teamSeason: { teamId: { in: fixture.teamIds } } } });
      await prisma.teamSeason.deleteMany({ where: { teamId: { in: fixture.teamIds } } });
      await prisma.team.deleteMany({ where: { id: { in: fixture.teamIds } } });
    }
    if (fixture.seasonIds.length) {
      await prisma.season.deleteMany({ where: { id: { in: fixture.seasonIds } } });
    }
    if (fixture.orgUnitIds.length) {
      await prisma.orgUnitMembership.deleteMany({ where: { orgUnitId: { in: fixture.orgUnitIds } } });
      await prisma.orgUnit.deleteMany({ where: { id: { in: fixture.orgUnitIds } } });
    }
    if (fixture.roleIds.length) {
      await prisma.userRole.deleteMany({ where: { roleId: { in: fixture.roleIds } } });
      await prisma.role.deleteMany({ where: { id: { in: fixture.roleIds } } });
    }
    if (fixture.targetGroupIds.length) {
      await prisma.targetGroup.deleteMany({ where: { id: { in: fixture.targetGroupIds } } });
    }
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

  async function createSeason(label: string) {
    const season = await prisma.season.create({
      data: {
        key: `req06g6-${label}-${Date.now()}`,
        name: `Season ${label}`,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        isActive: true,
      },
    });
    fixture.seasonIds.push(season.id);
    return season;
  }

  it("A02/A03/A09/A10/A11 — TEAM snapshot and post-activation membership stability", async () => {
    const tenant = await createRequirementTestTenant("team");
    const manager = await createRequirementTestUser("team-mgr");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id);

    const player = await createRequirementTestPerson(tenant.id, "player");
    fixture.personIds.push(player.id);

    const season = await createSeason("team");
    const team = await prisma.team.create({
      data: {
        tenantId: tenant.id,
        name: "Team F2",
        slug: `team-f2-${Date.now()}`,
        category: "AKTIVE",
        isActive: true,
      },
    });
    fixture.teamIds.push(team.id);

    const teamSeason = await prisma.teamSeason.create({
      data: {
        teamId: team.id,
        seasonId: season.id,
        displayName: team.name,
        status: "ACTIVE",
      },
    });

    await prisma.playerSquadMember.create({
      data: { teamSeasonId: teamSeason.id, personId: player.id, status: "ACTIVE" },
    });

    const foreignTenant = await createRequirementTestTenant("foreign");
    fixture.tenantIds.push(foreignTenant.id);
    const foreignTeam = await prisma.team.create({
      data: {
        tenantId: foreignTenant.id,
        name: "Foreign",
        slug: `foreign-${Date.now()}`,
        category: "AKTIVE",
        isActive: true,
      },
    });

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "Team requirement" });
    fixture.requirementIds.push(draft.id);

    await expect(
      setRequirementDraftAudienceSelectors(ctx, draft.id, { teamIds: [foreignTeam.id] }),
    ).rejects.toBeInstanceOf(RequirementTenantMismatchError);

    await setRequirementDraftAudienceSelectors(ctx, draft.id, { teamIds: [team.id] });
    await activateRequirement(ctx, draft.id);

    const recipients = await prisma.requirementRecipient.findMany({
      where: { requirementId: draft.id },
    });
    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.subjectPersonId).toBe(player.id);

    await prisma.playerSquadMember.deleteMany({ where: { teamSeasonId: teamSeason.id } });
    expect(await prisma.requirementRecipient.count({ where: { requirementId: draft.id } })).toBe(1);

    const newcomer = await createRequirementTestPerson(tenant.id, "newcomer");
    fixture.personIds.push(newcomer.id);
    await prisma.playerSquadMember.create({
      data: { teamSeasonId: teamSeason.id, personId: newcomer.id, status: "ACTIVE" },
    });
    expect(await prisma.requirementRecipient.count({ where: { requirementId: draft.id } })).toBe(1);
  });

  it("A04/A05 — ORG_UNIT resolves active members and rejects foreign org units", async () => {
    const tenant = await createRequirementTestTenant("org");
    const manager = await createRequirementTestUser("org-mgr");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id);

    const member = await createRequirementTestPerson(tenant.id, "org-member");
    fixture.personIds.push(member.id);

    const orgUnit = await prisma.orgUnit.create({
      data: {
        tenantId: tenant.id,
        key: `org-${Date.now()}`,
        name: "Junioren",
        status: "ACTIVE",
      },
    });
    fixture.orgUnitIds.push(orgUnit.id);

    await prisma.orgUnitMembership.create({
      data: {
        tenantId: tenant.id,
        orgUnitId: orgUnit.id,
        personId: member.id,
        status: "ACTIVE",
      },
    });

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "Org requirement" });
    fixture.requirementIds.push(draft.id);

    const foreignTenant = await createRequirementTestTenant("org-foreign");
    fixture.tenantIds.push(foreignTenant.id);
    const foreignOrg = await prisma.orgUnit.create({
      data: {
        tenantId: foreignTenant.id,
        key: `foreign-org-${Date.now()}`,
        name: "Foreign Org",
        status: "ACTIVE",
      },
    });

    await expect(
      setRequirementDraftAudienceSelectors(ctx, draft.id, { orgUnitIds: [foreignOrg.id] }),
    ).rejects.toBeInstanceOf(RequirementTenantMismatchError);

    await setRequirementDraftAudienceSelectors(ctx, draft.id, { orgUnitIds: [orgUnit.id] });
    await activateRequirement(ctx, draft.id);

    const recipients = await prisma.requirementRecipient.findMany({ where: { requirementId: draft.id } });
    expect(recipients.map((r) => r.subjectPersonId)).toEqual([member.id]);
  });

  it("A06/A18 — ROLE_AUDIENCE resolves tenant role holders as Person subjects", async () => {
    const tenant = await createRequirementTestTenant("role");
    const manager = await createRequirementTestUser("role-mgr");
    const roleUser = await createRequirementTestUser("role-holder");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id, roleUser.id);

    const rolePerson = await createRequirementTestPerson(tenant.id, "role-person", roleUser.id);
    fixture.personIds.push(rolePerson.id);

    await prisma.tenantMembership.create({
      data: { tenantId: tenant.id, userId: roleUser.id, isActive: true },
    });

    const role = await prisma.role.create({
      data: {
        key: `req-role-${Date.now()}`,
        name: "Trainer",
        scope: "TENANT",
        tenantId: tenant.id,
      },
    });
    fixture.roleIds.push(role.id);
    await prisma.userRole.create({
      data: { userId: roleUser.id, roleId: role.id, tenantId: tenant.id },
    });

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "Role requirement" });
    fixture.requirementIds.push(draft.id);

    await setRequirementDraftAudienceSelectors(ctx, draft.id, { roleIds: [role.id] });
    await activateRequirement(ctx, draft.id);

    const recipients = await prisma.requirementRecipient.findMany({ where: { requirementId: draft.id } });
    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.subjectPersonId).toBe(rolePerson.id);
  });

  it("A08/A14/A15 — mixed audiences dedupe and downstream contracts stay audience-independent", async () => {
    const tenant = await createRequirementTestTenant("mixed");
    const manager = await createRequirementTestUser("mixed-mgr");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id);

    const michael = await createRequirementTestPerson(tenant.id, "michael");
    fixture.personIds.push(michael.id);

    const season = await createSeason("mixed");
    const team = await prisma.team.create({
      data: {
        tenantId: tenant.id,
        name: "Mixed Team",
        slug: `mixed-${Date.now()}`,
        category: "AKTIVE",
        isActive: true,
      },
    });
    fixture.teamIds.push(team.id);
    const teamSeason = await prisma.teamSeason.create({
      data: { teamId: team.id, seasonId: season.id, displayName: team.name, status: "ACTIVE" },
    });
    await prisma.playerSquadMember.create({
      data: { teamSeasonId: teamSeason.id, personId: michael.id, status: "ACTIVE" },
    });

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "Mixed audience" });
    fixture.requirementIds.push(draft.id);

    await setRequirementDraftAudienceSelectors(ctx, draft.id, {
      personIds: [michael.id],
      teamIds: [team.id],
    });
    await activateRequirement(ctx, draft.id);

    const recipients = await prisma.requirementRecipient.findMany({ where: { requirementId: draft.id } });
    expect(recipients).toHaveLength(1);
    expect(buildRequirementPersonalActionId(recipients[0]!.id)).toBe(
      `requirement:${recipients[0]!.id}`,
    );

    const aggregate = await getRequirementAggregate(ctx, draft.id);
    expect(aggregate.totalRecipients).toBe(1);
    expect(aggregate.openCount).toBe(1);
  });

  it("A12/A13 — child subject from TEAM keeps guardian as responder, one recipient", async () => {
    const tenant = await createRequirementTestTenant("guardian");
    const manager = await createRequirementTestUser("guardian-mgr");
    const guardianUser = await createRequirementTestUser("guardian-user");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id, guardianUser.id);

    const guardianPerson = await createRequirementTestPerson(tenant.id, "guardian", guardianUser.id);
    const childPerson = await createRequirementTestPerson(tenant.id, "child");
    fixture.personIds.push(guardianPerson.id, childPerson.id);

    await prisma.guardianRelationship.create({
      data: {
        tenantId: tenant.id,
        childPersonId: childPerson.id,
        guardianPersonId: guardianPerson.id,
      },
    });

    const season = await createSeason("guardian");
    const team = await prisma.team.create({
      data: {
        tenantId: tenant.id,
        name: "Child Team",
        slug: `child-team-${Date.now()}`,
        category: "AKTIVE",
        isActive: true,
      },
    });
    fixture.teamIds.push(team.id);
    const teamSeason = await prisma.teamSeason.create({
      data: { teamId: team.id, seasonId: season.id, displayName: team.name, status: "ACTIVE" },
    });
    await prisma.playerSquadMember.create({
      data: { teamSeasonId: teamSeason.id, personId: childPerson.id, status: "ACTIVE" },
    });

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "Child team req" });
    fixture.requirementIds.push(draft.id);
    await setRequirementDraftAudienceSelectors(ctx, draft.id, { teamIds: [team.id] });
    await activateRequirement(ctx, draft.id);

    const recipients = await prisma.requirementRecipient.findMany({ where: { requirementId: draft.id } });
    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.subjectPersonId).toBe(childPerson.id);
    expect(
      await prisma.requirementRecipient.count({
        where: { requirementId: draft.id, subjectPersonId: guardianPerson.id },
      }),
    ).toBe(0);
  });

  it("A17 — inactive squad memberships are excluded at activation", async () => {
    const tenant = await createRequirementTestTenant("inactive");
    const manager = await createRequirementTestUser("inactive-mgr");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id);

    const inactivePlayer = await createRequirementTestPerson(tenant.id, "inactive-player");
    fixture.personIds.push(inactivePlayer.id);
    const season = await createSeason("inactive");
    const team = await prisma.team.create({
      data: {
        tenantId: tenant.id,
        name: "Inactive Team",
        slug: `inactive-${Date.now()}`,
        category: "AKTIVE",
        isActive: true,
      },
    });
    fixture.teamIds.push(team.id);
    const teamSeason = await prisma.teamSeason.create({
      data: { teamId: team.id, seasonId: season.id, displayName: team.name, status: "ACTIVE" },
    });
    await prisma.playerSquadMember.create({
      data: { teamSeasonId: teamSeason.id, personId: inactivePlayer.id, status: "INACTIVE" },
    });

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "Inactive member" });
    fixture.requirementIds.push(draft.id);
    await setRequirementDraftAudienceSelectors(ctx, draft.id, { teamIds: [team.id] });

    await expect(activateRequirement(ctx, draft.id)).rejects.toThrow(/Audience must not be empty/);
  });

  it("TARGET_GROUP — canonical model resolves to Person ids", async () => {
    const tenant = await createRequirementTestTenant("tg");
    const manager = await createRequirementTestUser("tg-mgr");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id);

    const person = await createRequirementTestPerson(tenant.id, "tg-person");
    fixture.personIds.push(person.id);

    const targetGroup = await prisma.targetGroup.create({
      data: {
        tenantId: tenant.id,
        key: `tg-${Date.now()}`,
        name: "Explicit TG",
        status: "ACTIVE",
        ruleJson: { type: "personIds", value: [person.id] },
      },
    });
    fixture.targetGroupIds.push(targetGroup.id);

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "Target group req" });
    fixture.requirementIds.push(draft.id);
    await setRequirementDraftAudienceSelectors(ctx, draft.id, { targetGroupIds: [targetGroup.id] });
    await activateRequirement(ctx, draft.id);

    const recipients = await prisma.requirementRecipient.findMany({ where: { requirementId: draft.id } });
    expect(recipients.map((r) => r.subjectPersonId)).toEqual([person.id]);
  });

  it("A01 regression — explicit persons path still works", async () => {
    const tenant = await createRequirementTestTenant("explicit");
    const manager = await createRequirementTestUser("explicit-mgr");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id);
    const person = await createRequirementTestPerson(tenant.id, "explicit");
    fixture.personIds.push(person.id);

    const ctx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(ctx, { title: "Explicit" });
    fixture.requirementIds.push(draft.id);
    await setRequirementDraftAudience(ctx, draft.id, [person.id]);
    await activateRequirement(ctx, draft.id);

    const aggregate = await computeRequirementAggregate(prisma, tenant.id, draft.id);
    expect(aggregate.totalRecipients).toBe(1);
  });
});

describe("AUFGABEN-06G6 — snapshot resolver unit", () => {
  it("A08 deduplicates explicit person snapshot rows", async () => {
    const ids = await resolveRequirementAudiencePersonIdsFromSnapshot("tenant-a", {
      persons: [{ personId: "p1" }, { personId: "p1" }],
      teams: [],
      orgUnits: [],
      roles: [],
      targetGroups: [],
    });
    expect(ids).toEqual(["p1"]);
  });
});
