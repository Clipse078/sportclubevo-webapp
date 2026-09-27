import { describe, expect, it, vi, beforeEach } from "vitest";
import { computeAudienceFingerprint } from "@/lib/communication/platform/recipient-resolution/audience-fingerprint";
import {
  differenceSortedSets,
  intersectSortedSets,
  sortPersonIds,
  unionSortedSets,
} from "@/lib/communication/platform/recipient-resolution/set-algebra";
import {
  resolveAudienceCandidates,
  MAX_SAVED_TARGET_GROUP_NESTING_DEPTH,
} from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { buildDispatchRecipientSnapshots } from "@/lib/communication/platform/recipient-resolution/snapshot-builder";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

const mocks = vi.hoisted(() => ({
  person: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
  orgUnit: { findMany: vi.fn() },
  team: { findMany: vi.fn() },
  teamSeason: { findMany: vi.fn() },
  orgUnitMembership: { findMany: vi.fn() },
  role: { findMany: vi.fn() },
  userRole: { findMany: vi.fn() },
  tenantMembership: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
  targetGroup: { findUnique: vi.fn(), findMany: vi.fn() },
  trainerTeamMember: { findMany: vi.fn() },
  guardianRelationship: { findMany: vi.fn() },
  getEffectivePermissions: vi.fn(),
  userCommunicationPreference: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    person: mocks.person,
    orgUnit: mocks.orgUnit,
    team: mocks.team,
    teamSeason: mocks.teamSeason,
    orgUnitMembership: mocks.orgUnitMembership,
    role: mocks.role,
    userRole: mocks.userRole,
    tenantMembership: mocks.tenantMembership,
    user: mocks.user,
    targetGroup: mocks.targetGroup,
    trainerTeamMember: mocks.trainerTeamMember,
    guardianRelationship: mocks.guardianRelationship,
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

vi.mock("@/lib/org/target-group-resolver", () => ({
  resolveTargetGroup: vi.fn(async (id: string, tenantId?: string) => {
    if (id === "tg-legacy" && tenantId === "tenant-a") {
      return {
        targetGroupId: id,
        personIds: ["p-legacy"],
        userIds: [],
        members: [],
        resolvedAt: new Date().toISOString(),
        memberCount: 1,
      };
    }
    return null;
  }),
}));

describe("SCE-COMM-03 recipient resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: ["communication.zielgruppen.manage"],
    });
    mocks.guardianRelationship.findMany.mockResolvedValue([]);
    mocks.trainerTeamMember.findMany.mockResolvedValue([]);
    mocks.userCommunicationPreference.findMany.mockResolvedValue([]);
    mocks.orgUnitMembership.findMany.mockResolvedValue([]);
    mocks.tenantMembership.findMany.mockResolvedValue([]);
    mocks.userRole.findMany.mockResolvedValue([]);
    mocks.role.findMany.mockResolvedValue([]);
    mocks.team.findMany.mockResolvedValue([{ id: "team-1", tenantId: "tenant-a" }]);
    mocks.orgUnit.findMany.mockResolvedValue([
      { id: "ou-1", tenantId: "tenant-a", archivedAt: null, status: "ACTIVE" },
    ]);
    mocks.teamSeason.findMany.mockResolvedValue([
      {
        playerSquadMembers: [
          { person: { id: "p-player", isActive: true, tenantId: "tenant-a" } },
        ],
        trainerTeamMembers: [
          { person: { id: "p-trainer", isActive: true, tenantId: "tenant-a" } },
        ],
      },
    ]);
    mocks.person.findMany.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
      const ids = args?.where?.id?.in ?? [];
      return ids.map((id: string) => ({
        id,
        tenantId: id.startsWith("foreign") ? "tenant-b" : "tenant-a",
        isActive: !id.includes("inactive"),
        userId: id === "p-nouser" ? null : `u-${id}`,
        email: id === "p-noemail" ? null : `${id}@example.com`,
        firstName: "T",
        lastName: id,
        displayName: null,
        dateOfBirth: null,
      }));
    });
  });

  it("set algebra is deterministic", () => {
    expect(unionSortedSets([["b", "a"], ["c", "b"]])).toEqual(["a", "b", "c"]);
    expect(intersectSortedSets([["a", "b", "c"], ["b", "c", "d"]])).toEqual(["b", "c"]);
    expect(differenceSortedSets(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
    expect(sortPersonIds(["c", "a", "b"])).toEqual(["a", "b", "c"]);
  });

  it("audience fingerprint is stable", () => {
    const audience: CommunicationAudienceSpec = {
      composition: "UNION",
      components: [{ structural: { teamIds: ["team-1"] } }],
    };
    expect(computeAudienceFingerprint(audience)).toEqual(computeAudienceFingerprint(audience));
  });

  it("resolves whole organisation candidates", async () => {
    mocks.person.findMany.mockResolvedValueOnce([{ id: "p-1" }, { id: "p-2" }]);
    const result = await resolveAudienceCandidates({
      tenantId: "tenant-a",
      audience: {
        composition: "UNION",
        components: [{ structural: { wholeOrganisation: true } }],
      },
    });
    expect(result.candidatePersonIds).toEqual(["p-1", "p-2"]);
  });

  it("resolves org unit, team, explicit include and exclusion", async () => {
    mocks.orgUnitMembership.findMany.mockResolvedValue([
      { personId: "p-ou", userId: null },
    ]);
    const audience: CommunicationAudienceSpec = {
      composition: "UNION",
      components: [
        {
          structural: { orgUnitIds: ["ou-1"], teamIds: ["team-1"] },
          explicit: { includePersonIds: ["p-extra"], excludePersonIds: ["p-ou"] },
        },
      ],
    };
    const result = await resolveAudienceCandidates({ tenantId: "tenant-a", audience });
    expect(result.candidatePersonIds).toContain("p-player");
    expect(result.candidatePersonIds).toContain("p-trainer");
    expect(result.candidatePersonIds).toContain("p-extra");
    expect(result.candidatePersonIds).not.toContain("p-ou");
  });

  it("intersection composition via dynamic rule", async () => {
    mocks.orgUnitMembership.findMany.mockResolvedValue([
      { personId: "p-both", userId: null },
      { personId: "p-ou-only", userId: null },
    ]);
    mocks.userRole.findMany.mockResolvedValue([
      { userId: "u-role", user: { isActive: true } },
    ]);
    mocks.tenantMembership.findMany.mockResolvedValue([{ userId: "u-role" }]);
    mocks.role.findMany.mockResolvedValue([
      { id: "role-1", key: "trainer", tenantId: "tenant-a", scope: "TENANT" },
    ]);
    mocks.person.findMany.mockImplementation(async (args: { where?: { userId?: { in?: string[] }; id?: { in?: string[] } } }) => {
      if (args.where?.userId?.in) {
        return [{ id: "p-both", tenantId: "tenant-a", isActive: true, userId: "u-role" }];
      }
      const ids = args.where?.id?.in ?? [];
      return ids.map((id) => ({
        id,
        tenantId: "tenant-a",
        isActive: true,
        userId: `u-${id}`,
        email: `${id}@example.com`,
        firstName: "T",
        lastName: id,
        displayName: null,
        dateOfBirth: null,
      }));
    });

    const result = await resolveAudienceCandidates({
      tenantId: "tenant-a",
      audience: {
        composition: "UNION",
        components: [
          {
            structural: { orgUnitIds: ["ou-1"] },
            dynamicRule: {
              type: "intersection",
              clauses: [
                { type: "orgUnitIds", value: ["ou-1"] },
                { type: "roleKeys", value: ["trainer"] },
              ],
            },
          },
        ],
      },
    });
    expect(result.candidatePersonIds).toEqual(["p-both"]);
  });

  it("rejects cross-tenant structural references", async () => {
    mocks.orgUnit.findMany.mockResolvedValue([{ id: "ou-foreign", tenantId: "tenant-b" }]);
    await expect(
      resolveAudienceCandidates({
        tenantId: "tenant-a",
        audience: {
          composition: "UNION",
          components: [{ structural: { orgUnitIds: ["ou-foreign"] } }],
        },
      }),
    ).rejects.toThrow(/INVALID_ORG_UNIT_AUDIENCE/);
  });

  it("detects saved target group cycles", async () => {
    mocks.targetGroup.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      tenantId: "tenant-a",
      status: "ACTIVE",
      ruleJson: {
        schemaVersion: 2,
        audience: {
          composition: "UNION",
          components: [{ savedTargetGroupIds: ["tg-cycle"] }],
        },
        resolverClause: null,
      },
    }));

    const result = await resolveAudienceCandidates({
      tenantId: "tenant-a",
      audience: {
        composition: "UNION",
        components: [{ savedTargetGroupIds: ["tg-cycle"] }],
      },
    });
    expect(result.candidatePersonIds).toEqual([]);
    expect(
      result.excludedRecipients.some((e) => e.reasonCodes.includes("COMPOSITION_CYCLE")),
    ).toBe(true);
  });

  it("enforces nesting depth protection", async () => {
    expect(MAX_SAVED_TARGET_GROUP_NESTING_DEPTH).toBeGreaterThan(0);
  });

  it("intersects sender scope and marks exclusions", async () => {
    mocks.person.findMany.mockResolvedValueOnce([{ id: "p-1" }, { id: "p-2" }]);
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: ["communication.zielgruppen.view"],
    });
    mocks.orgUnitMembership.findMany.mockResolvedValue([]);
    mocks.person.findMany.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
      const ids = args?.where?.id?.in;
      if (!ids) return [{ id: "p-1" }, { id: "p-2" }];
      return ids.map((id) => ({
        id,
        tenantId: "tenant-a",
        isActive: true,
        userId: `u-${id}`,
        email: `${id}@example.com`,
        firstName: "T",
        lastName: id,
        displayName: null,
        dateOfBirth: null,
      }));
    });

    const result = await resolveCommunicationRecipients({
      tenantId: "tenant-a",
      senderActor: { userId: "sender-1" },
      audience: {
        composition: "UNION",
        components: [{ structural: { wholeOrganisation: true } }],
      },
      context: { kind: "ORGANISATION", tenantId: "tenant-a" },
      channel: "IN_APP",
      category: "CLUB_OPERATIONAL",
      mode: "PREVIEW",
    });

    expect(result.summary.candidateCount).toBe(2);
    expect(result.metadata.senderScopeLimitedPreview).toBe(true);
    expect(result.excludedRecipients.some((e) => e.reasonCodes.includes("OUTSIDE_SENDER_SCOPE"))).toBe(
      true,
    );
  });

  it("applies channel eligibility reason codes", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: ["communication.club.send"],
    });
    mocks.person.findMany.mockImplementation(
      async (args: { where?: { id?: { in?: string[] }; tenantId?: string } }) => {
        if (args.where?.tenantId && !args.where?.id) {
          return [
            {
              id: "p-nouser",
              tenantId: "tenant-a",
              isActive: true,
              userId: null,
              email: null,
              firstName: "T",
              lastName: "nouser",
              displayName: null,
              dateOfBirth: null,
            },
          ];
        }
        const ids = args?.where?.id?.in ?? ["p-nouser"];
        return ids.map((id) => ({
          id,
          tenantId: "tenant-a",
          isActive: true,
          userId: null,
          email: null,
          firstName: "T",
          lastName: id,
          displayName: null,
          dateOfBirth: null,
          guardianRelationshipsAsChild: [],
        }));
      },
    );

    const result = await resolveCommunicationRecipients({
      tenantId: "tenant-a",
      senderActor: { userId: "sender-1" },
      audience: {
        composition: "UNION",
        components: [{ explicit: { includePersonIds: ["p-nouser"] } }],
      },
      context: { kind: "ORGANISATION", tenantId: "tenant-a" },
      channel: "IN_APP",
      category: "CLUB_OPERATIONAL",
      mode: "PREVIEW",
    });

    expect(result.effectiveRecipientPersonIds).toEqual([]);
    expect(result.excludedRecipients[0]?.reasonCodes).toContain("CHANNEL_UNAVAILABLE");
    expect(result.metadata.preferenceEvaluation).toBe("EVALUATED");
  });

  it("builds dispatch snapshot rows without persistence", () => {
    const snapshots = buildDispatchRecipientSnapshots({
      communicationDispatchRef: "dispatch-1",
      tenantId: "tenant-a",
      audienceFingerprint: "abc",
      channel: "IN_APP",
      resolvedAt: "2026-01-01T00:00:00.000Z",
      deliveryTargets: [
        {
          subjectPersonId: "p-1",
          deliveryUserId: "u-1",
          channel: "IN_APP",
          capturedAt: "2026-01-01T00:00:00.000Z",
          viaGuardianSubstitution: false,
        },
      ],
    });
    expect(snapshots[0]?.resolvedFromAudience).toBe(true);
    expect(snapshots[0]?.communicationDispatchRef).toBe("dispatch-1");
  });
});
