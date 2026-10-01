import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  resolveTeamCommunicationFromScope,
  type TeamCommunicationAuthorizationScope,
} from "@/lib/communication/team/team-communication-authorization-scope";

function scope(input: Partial<TeamCommunicationAuthorizationScope> & Pick<TeamCommunicationAuthorizationScope, "allTeamIds">): TeamCommunicationAuthorizationScope {
  return {
    tenantId: "tenant-1",
    tenantKey: "fca",
    userId: "user-1",
    globalCanView: false,
    globalCanSend: false,
    allocationByTeamId: new Map(),
    ...input,
  };
}

/** Reference semantics (pre-batch per-team resolver). */
function legacyCanViewSend(input: {
  isSuperAdmin: boolean;
  isClubAdmin: boolean;
  tenantPermissions: string[];
  allocation: { isAllocated: boolean; isTrainer: boolean };
}) {
  const has = (key: string) => input.tenantPermissions.includes(key);
  const orgCommAdmin =
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE) ||
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW);
  const canView =
    input.isSuperAdmin ||
    input.isClubAdmin ||
    has(PERMISSIONS.COMMUNICATION_TEAM_VIEW) ||
    has(PERMISSIONS.COMMUNICATION_TEAM_SEND) ||
    orgCommAdmin ||
    has(PERMISSIONS.TEAMS_MANAGE) ||
    input.allocation.isAllocated;
  const canSend =
    input.isSuperAdmin ||
    input.isClubAdmin ||
    has(PERMISSIONS.COMMUNICATION_TEAM_SEND) ||
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE) ||
    has(PERMISSIONS.TEAMS_MANAGE) ||
    input.allocation.isTrainer;
  return { canView, canSend };
}

function scopeFromLegacy(input: {
  teamId: string;
  isSuperAdmin: boolean;
  isClubAdmin: boolean;
  tenantPermissions: string[];
  allocation: { isAllocated: boolean; isTrainer: boolean };
}): TeamCommunicationAuthorizationScope {
  const flags = legacyCanViewSend({
    isSuperAdmin: input.isSuperAdmin,
    isClubAdmin: input.isClubAdmin,
    tenantPermissions: input.tenantPermissions,
    allocation: { isAllocated: false, isTrainer: false },
  });
  const globalCanView =
    input.isSuperAdmin ||
    input.isClubAdmin ||
    flags.canView;
  const globalCanSend =
    input.isSuperAdmin || input.isClubAdmin || input.tenantPermissions.includes(PERMISSIONS.COMMUNICATION_TEAM_SEND) ||
    input.tenantPermissions.includes(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE) ||
    input.tenantPermissions.includes(PERMISSIONS.TEAMS_MANAGE);

  const allocationByTeamId = new Map([
    [
      input.teamId,
      {
        isAllocated: input.allocation.isAllocated,
        isPlayer: input.allocation.isAllocated && !input.allocation.isTrainer,
        isTrainer: input.allocation.isTrainer,
      },
    ],
  ]);

  return scope({
    allTeamIds: [input.teamId],
    globalCanView,
    globalCanSend,
    allocationByTeamId,
  });
}

function assertEquivalence(label: string, legacyInput: Parameters<typeof scopeFromLegacy>[0]) {
  const built = scopeFromLegacy(legacyInput);
  const fromScope = resolveTeamCommunicationFromScope(built, legacyInput.teamId);
  const legacy = legacyCanViewSend({
    isSuperAdmin: legacyInput.isSuperAdmin,
    isClubAdmin: legacyInput.isClubAdmin,
    tenantPermissions: legacyInput.tenantPermissions,
    allocation: legacyInput.allocation,
  });
  expect(fromScope, label).toEqual(legacy);
}

describe("team communication authorization batch equivalence", () => {
  it("club admin — all teams view/send", () => {
    assertEquivalence("club-admin", {
      teamId: "team-a",
      isSuperAdmin: false,
      isClubAdmin: true,
      tenantPermissions: [],
      allocation: { isAllocated: false, isTrainer: false },
    });
  });

  it("spielbetrieb koordinator — tenant communication view", () => {
    assertEquivalence("koordinator", {
      teamId: "team-a",
      isSuperAdmin: false,
      isClubAdmin: false,
      tenantPermissions: [PERMISSIONS.COMMUNICATION_TEAM_VIEW],
      allocation: { isAllocated: false, isTrainer: false },
    });
  });

  it("präsident pilot — teams manage", () => {
    assertEquivalence("president", {
      teamId: "team-a",
      isSuperAdmin: false,
      isClubAdmin: false,
      tenantPermissions: [PERMISSIONS.TEAMS_MANAGE],
      allocation: { isAllocated: false, isTrainer: false },
    });
  });

  it("team-scoped trainer allocation", () => {
    assertEquivalence("trainer", {
      teamId: "team-a",
      isSuperAdmin: false,
      isClubAdmin: false,
      tenantPermissions: [],
      allocation: { isAllocated: true, isTrainer: true },
    });
  });

  it("team-scoped player — view only", () => {
    assertEquivalence("player", {
      teamId: "team-a",
      isSuperAdmin: false,
      isClubAdmin: false,
      tenantPermissions: [],
      allocation: { isAllocated: true, isTrainer: false },
    });
  });

  it("no team access", () => {
    assertEquivalence("no-access", {
      teamId: "team-a",
      isSuperAdmin: false,
      isClubAdmin: false,
      tenantPermissions: [],
      allocation: { isAllocated: false, isTrainer: false },
    });
  });

  it("cross-tenant unknown team returns null", () => {
    const built = scope({ allTeamIds: ["team-a"] });
    expect(resolveTeamCommunicationFromScope(built, "team-other")).toBeNull();
  });
});
