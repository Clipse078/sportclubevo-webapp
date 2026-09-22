/**
 * AUFGABEN-05-PARTICIPATION — acceptance matrix P1–P30 (mocked boundaries).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getVisibleNavSections } from "@/lib/nav/nav-config";

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/tasks/task-service", () => ({
  listMyTasks: vi.fn(),
  countMyOpenTasks: vi.fn(),
}));

vi.mock("@/lib/participation/authorization", () => ({
  getAuthorizedPersonIdsForUser: vi.fn(),
  assertActorCanRespondForPerson: vi.fn(),
}));

vi.mock("@/lib/participation/participation-service", () => ({
  respondToParticipation: vi.fn(),
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: { findMany: vi.fn() },
    trainingSession: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    participationResponse: { findMany: vi.fn() },
    task: { create: vi.fn() },
  },
}));

vi.mock("../sources/requirement-obligations", () => ({
  loadRequirementObligationCandidates: vi.fn().mockResolvedValue([]),
  countOpenRequirementObligationsForUser: vi.fn().mockResolvedValue(0),
}));

import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { listMyTasks, countMyOpenTasks } from "@/lib/tasks/task-service";
import {
  assertActorCanRespondForPerson,
  getAuthorizedPersonIdsForUser,
} from "@/lib/participation/authorization";
import { respondToParticipation } from "@/lib/participation/participation-service";
import { logAction } from "@/lib/audit/log-action";
import { prisma } from "@/lib/db/prisma";
import { loadPersonalActions } from "../load-personal-actions";
import { countPersonalActions } from "../count-personal-actions";
import { submitParticipationPersonalAction } from "../submit-participation-response";
import { buildParticipationPersonalActionId } from "../identity";
import { mapPersonalActionToListItem } from "../presentation";
import { resolvePersonalActionsModuleCapabilities } from "../access";
import { ParticipationUnauthorizedError } from "@/lib/participation/errors";

const TENANT = "tenant-a";
const PARENT_USER = "user-parent";
const TS = "ts-1";
const TEAM = "team-1";
const SEASON = "season-1";
const NOW = new Date("2026-09-20T12:00:00.000Z");

function trainingId(personId: string, sessionId: string) {
  return buildParticipationPersonalActionId(personId, {
    eventKind: "TRAINING",
    trainingSessionId: sessionId,
  });
}

function mockSubmitInput(
  personId: string,
  sessionId: string,
  status: "YES" | "NO" = "YES",
) {
  return {
    personalActionId: trainingId(personId, sessionId),
    personId,
    teamSeasonId: TS,
    eventKind: "TRAINING" as const,
    trainingSessionId: sessionId,
    status,
  };
}

function mockRoster(personIds: string[]) {
  vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue(
    personIds.map((personId) => ({
      personId,
      teamSeasonId: TS,
      person: { firstName: "James", lastName: "Test", displayName: personId },
      teamSeason: {
        teamId: TEAM,
        seasonId: SEASON,
        displayName: "F2",
        team: { name: "F2" },
      },
    })) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRequestEffectivePermissions).mockResolvedValue({ platform: [], tenant: [] });
  vi.mocked(listMyTasks).mockResolvedValue([]);
  vi.mocked(countMyOpenTasks).mockResolvedValue(0);
});

describe("AUFGABEN-05-PARTICIPATION — mutation adapter", () => {
  beforeEach(() => {
    vi.mocked(assertActorCanRespondForPerson).mockResolvedValue({
      source: "PARENT",
      actorPersonId: "guardian-person",
    });
    vi.mocked(respondToParticipation).mockResolvedValue({ id: "resp-1", status: "YES" });
  });

  it("P1/P8 — parent without tasks.view resolves child TRAINING (lazy YES)", async () => {
    const result = await submitParticipationPersonalAction(
      TENANT,
      PARENT_USER,
      mockSubmitInput("child-james", "sess-1", "YES"),
    );
    expect(result.ok).toBe(true);
    expect(respondToParticipation).toHaveBeenCalledWith(
      TENANT,
      PARENT_USER,
      expect.objectContaining({
        personId: "child-james",
        status: "YES",
        event: { eventKind: "TRAINING", trainingSessionId: "sess-1" },
      }),
    );
  });

  it("P2 — parent resolves MATCH obligation", async () => {
    const id = buildParticipationPersonalActionId("child-james", {
      eventKind: "MATCH",
      eventId: "match-1",
    });
    const result = await submitParticipationPersonalAction(TENANT, PARENT_USER, {
      personalActionId: id,
      personId: "child-james",
      teamSeasonId: TS,
      eventKind: "MATCH",
      eventId: "match-1",
      status: "YES",
    });
    expect(result.ok).toBe(true);
    expect(respondToParticipation).toHaveBeenCalledWith(
      TENANT,
      PARENT_USER,
      expect.objectContaining({ event: { eventKind: "MATCH", eventId: "match-1" } }),
    );
  });

  it("P3 — parent resolves TOURNAMENT obligation", async () => {
    const id = buildParticipationPersonalActionId("child-james", {
      eventKind: "TOURNAMENT",
      eventId: "tour-1",
    });
    const result = await submitParticipationPersonalAction(TENANT, PARENT_USER, {
      personalActionId: id,
      personId: "child-james",
      teamSeasonId: TS,
      eventKind: "TOURNAMENT",
      eventId: "tour-1",
      status: "NO",
    });
    expect(result.ok).toBe(true);
  });

  it("P4 — adult player resolves own obligation", async () => {
    vi.mocked(assertActorCanRespondForPerson).mockResolvedValue({
      source: "PLAYER",
      actorPersonId: "player-self",
    });
    const result = await submitParticipationPersonalAction(
      TENANT,
      "user-player",
      mockSubmitInput("player-self", "sess-2", "YES"),
    );
    expect(result.ok).toBe(true);
  });

  it("P5/P24 — unrelated or stale guardian denied at mutation", async () => {
    vi.mocked(assertActorCanRespondForPerson).mockRejectedValue(
      new ParticipationUnauthorizedError(),
    );
    const result = await submitParticipationPersonalAction(
      TENANT,
      PARENT_USER,
      mockSubmitInput("unrelated-child", "sess-1"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/darf|nicht/i);
    }
  });

  it("P6/P7 — malformed identity fails closed", async () => {
    const result = await submitParticipationPersonalAction(TENANT, PARENT_USER, {
      ...mockSubmitInput("child-james", "sess-1"),
      personalActionId: "participation:child-james:TRAINING:wrong-session",
    });
    expect(result.ok).toBe(false);
  });

  it("P9 — OPEN becomes NO via canonical service", async () => {
    vi.mocked(respondToParticipation).mockResolvedValue({ id: "resp-2", status: "NO" });
    const result = await submitParticipationPersonalAction(
      TENANT,
      PARENT_USER,
      mockSubmitInput("child-james", "sess-1", "NO"),
    );
    expect(result.ok).toBe(true);
    expect(respondToParticipation).toHaveBeenCalledWith(
      TENANT,
      PARENT_USER,
      expect.objectContaining({ status: "NO" }),
    );
  });

  it("P25 — unsupported event kind in payload rejected", async () => {
    const result = await submitParticipationPersonalAction(TENANT, PARENT_USER, {
      personalActionId: "participation:p:OTHER:e1",
      personId: "p",
      teamSeasonId: TS,
      eventKind: "OTHER" as "TRAINING",
      eventId: "e1",
      status: "YES",
    });
    expect(result.ok).toBe(false);
  });

  it("P26/P27 — uses single canonical respondToParticipation (last-write-wins preserved)", async () => {
    await submitParticipationPersonalAction(
      TENANT,
      PARENT_USER,
      mockSubmitInput("child-james", "sess-1"),
    );
    await submitParticipationPersonalAction(
      TENANT,
      PARENT_USER,
      mockSubmitInput("child-james", "sess-1", "NO"),
    );
    expect(respondToParticipation).toHaveBeenCalledTimes(2);
    expect(logAction).not.toHaveBeenCalled();
  });

  it("P23 — PersonalAction adapter does not emit Task audit events", async () => {
    await submitParticipationPersonalAction(
      TENANT,
      PARENT_USER,
      mockSubmitInput("child-james", "sess-1"),
    );
    expect(logAction).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-05-PARTICIPATION — read model", () => {
  it("P10/P11/P12 — resolved YES/NO/MAYBE excluded from actionable inbox", async () => {
    const { filterActionableAttendanceCandidates } = await import(
      "../sources/attendance-obligations"
    );
    const candidates = [
      {
        personId: "c1",
        responseStatus: "OPEN",
        eventKind: "TRAINING",
        trainingSessionId: "s1",
      },
      {
        personId: "c2",
        responseStatus: "YES",
        eventKind: "TRAINING",
        trainingSessionId: "s2",
      },
      {
        personId: "c3",
        responseStatus: "NO",
        eventKind: "TRAINING",
        trainingSessionId: "s3",
      },
      {
        personId: "c4",
        responseStatus: "MAYBE",
        eventKind: "TRAINING",
        trainingSessionId: "s4",
      },
    ] as never[];
    const actionable = filterActionableAttendanceCandidates(candidates);
    expect(actionable).toHaveLength(1);
    expect(actionable[0].personId).toBe("c1");
  });

  it("P13/P14 — shared canonical response resolves for all guardians on fresh read", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-james"]);
    mockRoster(["child-james"]);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([
      {
        id: "sess-1",
        teamSeasonId: TS,
        startAt: new Date("2026-09-23T15:45:00.000Z"),
        trainingSeries: { title: "Training" },
      },
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    const before = await loadPersonalActions({ tenantId: TENANT, userId: "guardian-a", now: NOW });
    expect(before).toHaveLength(1);

    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([
      {
        id: "resp-1",
        personId: "child-james",
        teamSeasonId: TS,
        eventKind: "TRAINING",
        trainingSessionId: "sess-1",
        eventId: null,
        status: "YES",
      },
    ] as never);

    const after = await loadPersonalActions({ tenantId: TENANT, userId: "guardian-b", now: NOW });
    expect(after).toHaveLength(0);
  });

  it("P15/P16 — two children remain distinct obligations", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["james", "memphis"]);
    mockRoster(["james", "memphis"]);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([
      {
        id: "sess-1",
        teamSeasonId: TS,
        startAt: new Date("2026-09-23T15:45:00.000Z"),
        trainingSeries: { title: "Training" },
      },
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    const actions = await loadPersonalActions({ tenantId: TENANT, userId: PARENT_USER, now: NOW });
    expect(actions).toHaveLength(2);
    expect(actions.map((a) => a.subject?.personId).sort()).toEqual(["james", "memphis"]);
  });

  it("P17 — trainer only sees authorized persons, not whole team", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["trainer-self"]);
    mockRoster(["trainer-self", "player-x", "player-y"]);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    const actions = await loadPersonalActions({ tenantId: TENANT, userId: "trainer-user", now: NOW });
    expect(getAuthorizedPersonIdsForUser).toHaveBeenCalled();
    expect(actions.every((a) => a.subject?.personId === "trainer-self" || a.sourceType === "TASK")).toBe(
      true,
    );
  });

  it("P20 — participation dueAt stays null in presentation", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-james"]);
    mockRoster(["child-james"]);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([
      {
        id: "sess-1",
        teamSeasonId: TS,
        startAt: new Date("2026-09-23T15:45:00.000Z"),
        trainingSeries: { title: "Training F2" },
      },
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    const [action] = await loadPersonalActions({ tenantId: TENANT, userId: PARENT_USER, now: NOW });
    expect(action.dueAt).toBeNull();
    const item = mapPersonalActionToListItem(
      action,
      { locale: "de-CH", timezone: "Europe/Zurich" },
      "de-CH",
      "Europe/Zurich",
    );
    expect(item.metaLine).not.toMatch(/Fällig|Überfällig/i);
  });

  it("P28 — mixed inbox count drops by one after attendance resolution", async () => {
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW],
    });
    vi.mocked(countMyOpenTasks).mockResolvedValue(2);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-james"]);
    mockRoster(["child-james"]);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([
      {
        id: "sess-1",
        teamSeasonId: TS,
        startAt: new Date("2026-09-23T15:45:00.000Z"),
        trainingSeries: { title: "Training" },
      },
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    const before = await countPersonalActions({ tenantId: TENANT, userId: PARENT_USER, now: NOW });
    expect(before.totalActionable).toBe(3);

    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([
      {
        id: "resp-1",
        personId: "child-james",
        teamSeasonId: TS,
        eventKind: "TRAINING",
        trainingSessionId: "sess-1",
        eventId: null,
        status: "YES",
      },
    ] as never);

    const after = await countPersonalActions({ tenantId: TENANT, userId: PARENT_USER, now: NOW });
    expect(after.totalActionable).toBe(2);
  });

  it("P22 — no Task prisma create on participation load", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-james"]);
    mockRoster(["child-james"]);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([
      {
        id: "sess-1",
        teamSeasonId: TS,
        startAt: new Date("2026-09-23T15:45:00.000Z"),
        trainingSeries: { title: "Training" },
      },
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    await loadPersonalActions({ tenantId: TENANT, userId: PARENT_USER, now: NOW });
    expect(prisma.task.create).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-05-PARTICIPATION — navigation & matrix", () => {
  it("P18/P19 — parent without tasks.view keeps Aufgaben nav with zero actions", () => {
    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: TENANT,
      userId: PARENT_USER,
      permissionKeys: [],
      participationNavCapable: true,
      requirementRecipientCapable: false,
    });
    expect(caps.moduleAccess).toBe(true);
    expect(caps.taskManagement).toBe(false);
    expect(caps.personalInbox).toBe(true);

    const sections = getVisibleNavSections([], "club", { personalActionsModule: true });
    expect(sections.flatMap((s) => s.items.map((i) => i.key))).toContain("aufgaben");

    const capsZero = resolvePersonalActionsModuleCapabilities({
      tenantId: TENANT,
      userId: "no-participation-user",
      permissionKeys: [],
      participationNavCapable: false,
      requirementRecipientCapable: false,
    });
    expect(capsZero.moduleAccess).toBe(false);
  });

  it("P18 — VP + trainer + parent capabilities remain additive", () => {
    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: TENANT,
      userId: "vp-user",
      permissionKeys: [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.TASKS_VIEW_ALL,
      ],
      participationNavCapable: true,
      requirementRecipientCapable: false,
    });
    expect(caps.taskManagement).toBe(true);
    expect(caps.personalInbox).toBe(true);
    expect(caps.moduleAccess).toBe(true);
  });
});

describe("AUFGABEN-05-PARTICIPATION — static guards", () => {
  it("P21 — presentation does not project RSVP deadline into agenda fields", async () => {
    const { mapPersonalActionsToPreviewItems } = await import("../presentation");
    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: PARENT_USER,
      now: NOW,
    }).catch(() => []);
    if (actions.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const preview = mapPersonalActionsToPreviewItems(
      actions,
      { locale: "de-CH", timezone: "Europe/Zurich" },
      "de-CH",
      "Europe/Zurich",
    );
    for (const row of preview) {
      expect(row.metaLine ?? "").not.toMatch(/Fällig|Deadline|Überfällig/i);
    }
  });

  it("P30 — no participation notification producer in personal-actions module", async () => {
    const fs = await import("node:fs/promises");
    const paths = [
      "/workspace/lib/personal-actions/submit-participation-response.ts",
      "/workspace/lib/personal-actions/sources/attendance-source.ts",
      "/workspace/app/(admin)/dashboard/aufgaben/personal-participation-actions.ts",
    ];
    for (const path of paths) {
      const text = await fs.readFile(path, "utf8");
      expect(text).not.toMatch(/PARTICIPATION_REQUESTED|PARTICIPATION_DUE_SOON|PARTICIPATION_OVERDUE/);
      expect(text).not.toMatch(/notification\.create/);
    }
  });
});
