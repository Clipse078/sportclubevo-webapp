/**
 * AUFGABEN-05-FOUNDATION-A1 — explicit acceptance coverage beyond unit mocks.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/tasks/task-service", () => ({
  listMyTasks: vi.fn(),
  countMyOpenTasks: vi.fn(),
}));

vi.mock("@/lib/participation/authorization", () => ({
  getAuthorizedPersonIdsForUser: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: { findMany: vi.fn() },
    trainingSession: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    task: { create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    taskAssignee: { create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    notification: { create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    participationResponse: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { listMyTasks, countMyOpenTasks } from "@/lib/tasks/task-service";
import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import { prisma } from "@/lib/db/prisma";
import { loadPersonalActions } from "../load-personal-actions";
import { countPersonalActions } from "../count-personal-actions";
import { loadAttendanceObligationCandidates } from "../sources/attendance-obligations";
import { personalActionSources } from "../sources";
import { PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS } from "../config";
import { buildParticipationPersonalActionId } from "../identity";

const TENANT = "tenant-a";
const NOW = new Date("2026-09-20T12:00:00.000Z");
const CHILD = "child-c";
const TS_ID = "ts-1";
const TEAM_ID = "team-1";
const SEASON_ID = "season-1";

function mockRoster(personIds: string[]) {
  vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue(
    personIds.map((personId) => ({
      personId,
      teamSeasonId: TS_ID,
      person: {
        firstName: "Test",
        lastName: "Player",
        displayName: personId,
      },
      teamSeason: {
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        displayName: "U15",
        team: { name: "Team U15" },
      },
    })) as never,
  );
}

function mockMatchEvent(eventId = "match-1", startAt = new Date("2026-09-25T18:00:00.000Z")) {
  vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.event.findMany).mockResolvedValue([
    {
      id: eventId,
      teamId: TEAM_ID,
      seasonId: SEASON_ID,
      type: "MATCH",
      title: "Heimspiel",
      startAt,
    },
  ] as never);
  vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
    platform: [],
    tenant: [],
  });
  vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([]);
  vi.mocked(listMyTasks).mockResolvedValue([]);
  vi.mocked(countMyOpenTasks).mockResolvedValue(0);
  mockRoster([CHILD]);
});

describe("AUFGABEN-05-FOUNDATION-A1", () => {
  it("6 — parent without tasks.view receives attendance only (end-to-end prisma path)", async () => {
    mockMatchEvent();
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([CHILD]);

    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-a",
      permissionKeys: [],
      now: NOW,
    });

    expect(listMyTasks).not.toHaveBeenCalled();
    expect(actions).toHaveLength(1);
    expect(actions[0].sourceType).toBe("ATTENDANCE_RESPONSE");
  });

  it("7 — multi-guardian same obligation identity; YES clears for both readers", async () => {
    mockMatchEvent();
    vi.mocked(getAuthorizedPersonIdsForUser).mockImplementation(async (_t, userId) =>
      userId === "guardian-a" || userId === "guardian-b" ? [CHILD] : [],
    );

    const beforeA = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-a",
      permissionKeys: [],
      now: NOW,
    });
    const beforeB = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-b",
      permissionKeys: [],
      now: NOW,
    });

    const expectedId = buildParticipationPersonalActionId(CHILD, {
      eventKind: "MATCH",
      eventId: "match-1",
    });
    expect(beforeA[0].id).toBe(expectedId);
    expect(beforeB[0].id).toBe(expectedId);

    for (const status of ["YES", "NO", "MAYBE"] as const) {
      vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([
        {
          id: `resp-${status}`,
          personId: CHILD,
          teamSeasonId: TS_ID,
          eventKind: "MATCH",
          trainingSessionId: null,
          eventId: "match-1",
          status,
        },
      ] as never);

      const afterA = await loadPersonalActions({
        tenantId: TENANT,
        userId: "guardian-a",
        permissionKeys: [],
        now: NOW,
      });
      const afterB = await loadPersonalActions({
        tenantId: TENANT,
        userId: "guardian-b",
        permissionKeys: [],
        now: NOW,
      });
      expect(afterA).toHaveLength(0);
      expect(afterB).toHaveLength(0);
    }
  });

  it("8 — multi-child distinct stable ids on same event", async () => {
    mockRoster(["child-1", "child-2"]);
    mockMatchEvent();
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-1", "child-2"]);

    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-a",
      permissionKeys: [],
      now: NOW,
    });

    expect(actions).toHaveLength(2);
    expect(actions[0].id).not.toBe(actions[1].id);
    expect(actions.map((a) => a.subject?.personId).sort()).toEqual(["child-1", "child-2"]);
  });

  it("9 — self-linked person receives attendance without guardian relationship", async () => {
    mockRoster(["self-person"]);
    mockMatchEvent();
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["self-person"]);

    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: "self-user",
      permissionKeys: [],
      now: NOW,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0].subject?.personId).toBe("self-person");
  });

  it("10 — cross-tenant roster membership does not produce actions", async () => {
    vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([] as never);
    mockMatchEvent();
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-tenant-b"]);

    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-a",
      permissionKeys: [],
      now: NOW,
    });

    expect(actions).toHaveLength(0);
  });

  it("15 — stable PersonalAction.id when ParticipationResponse appears", async () => {
    mockMatchEvent();
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([CHILD]);

    const missing = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-a",
      permissionKeys: [],
      now: NOW,
    });
    expect(missing[0].sourceId).toBeNull();

    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([
      {
        id: "resp-open",
        personId: CHILD,
        teamSeasonId: TS_ID,
        eventKind: "MATCH",
        trainingSessionId: null,
        eventId: "match-1",
        status: "OPEN",
      },
    ] as never);

    const open = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-a",
      permissionKeys: [],
      now: NOW,
    });
    expect(open[0].id).toBe(missing[0].id);
    expect(open[0].sourceId).toBe("resp-open");
  });

  it("16 — horizon boundaries with deterministic clock", async () => {
    mockRoster([CHILD]);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([CHILD]);

    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    await loadAttendanceObligationCandidates(TENANT, [CHILD], NOW);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: expect.objectContaining({ gte: NOW }),
        }),
      }),
    );

    const inside = new Date(NOW);
    inside.setDate(inside.getDate() + 89);
    mockMatchEvent("match-inside", inside);
    const insideRows = await loadAttendanceObligationCandidates(TENANT, [CHILD], NOW);
    expect(insideRows).toHaveLength(1);

    const boundary = new Date(NOW);
    boundary.setDate(boundary.getDate() + PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS);
    mockMatchEvent("match-boundary", boundary);
    const boundaryRows = await loadAttendanceObligationCandidates(TENANT, [CHILD], NOW);
    expect(boundaryRows).toHaveLength(1);

    const until = new Date(NOW);
    until.setDate(until.getDate() + PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS);
    vi.mocked(prisma.event.findMany).mockClear();
    vi.mocked(prisma.trainingSession.findMany).mockClear();
    await loadAttendanceObligationCandidates(TENANT, [CHILD], NOW);
    expect(prisma.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { gte: NOW, lte: until },
        }),
      }),
    );
  });

  it("17 — >25 trainings within 90 days are all included (no per-team truncation)", async () => {
    mockRoster([CHILD]);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([CHILD]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    const sessions = Array.from({ length: 39 }, (_, i) => {
      const startAt = new Date(NOW);
      startAt.setDate(startAt.getDate() + i + 1);
      return {
        id: `session-${i}`,
        teamSeasonId: TS_ID,
        startAt,
        trainingSeries: { title: `Training ${i}` },
      };
    });
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue(sessions as never);

    const rows = await loadAttendanceObligationCandidates(TENANT, [CHILD], NOW);
    expect(rows).toHaveLength(39);
    expect(prisma.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ startAt: "asc" }],
      }),
    );
    expect(prisma.trainingSession.findMany.mock.calls[0][0]).not.toHaveProperty("take");
  });

  it("21 — limit applies after merge (not per-source cap)", async () => {
    vi.mocked(listMyTasks).mockResolvedValue([]);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([CHILD]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "match-1",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "M1",
        startAt: new Date("2026-09-21T18:00:00.000Z"),
      },
      {
        id: "match-2",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "M2",
        startAt: new Date("2026-09-22T18:00:00.000Z"),
      },
      {
        id: "match-3",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "M3",
        startAt: new Date("2026-09-23T18:00:00.000Z"),
      },
    ] as never);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);

    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-a",
      permissionKeys: [],
      now: NOW,
      limit: 2,
    });

    expect(actions).toHaveLength(2);
    expect(actions.every((a) => a.sourceType === "ATTENDANCE_RESPONSE")).toBe(true);
    expect(actions.map((a) => a.title)).toEqual(["M1", "M2"]);
  });

  it("22 — count is independent of list limit", async () => {
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW],
    });
    vi.mocked(countMyOpenTasks).mockResolvedValue(0);
    vi.mocked(listMyTasks).mockResolvedValue([]);
    mockRoster([CHILD]);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([CHILD]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        id: `session-${i}`,
        teamSeasonId: TS_ID,
        startAt: new Date(NOW.getTime() + (i + 1) * 86400000),
        trainingSeries: { title: `T${i}` },
      })) as never,
    );

    const limited = await loadPersonalActions({
      tenantId: TENANT,
      userId: "user-a",
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      now: NOW,
      limit: 3,
    });
    const counts = await countPersonalActions({
      tenantId: TENANT,
      userId: "user-a",
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      now: NOW,
    });

    expect(limited).toHaveLength(3);
    expect(counts.attendanceActionable).toBe(8);
    expect(counts.totalActionable).toBe(8);
  });

  it("13 — read paths do not write Task / ParticipationResponse / Notification", async () => {
    mockMatchEvent();
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([CHILD]);
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW],
    });

    await loadPersonalActions({
      tenantId: TENANT,
      userId: "user-a",
      now: NOW,
    });
    await countPersonalActions({
      tenantId: TENANT,
      userId: "user-a",
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      now: NOW,
    });

    expect(prisma.task.create).not.toHaveBeenCalled();
    expect(prisma.task.update).not.toHaveBeenCalled();
    expect(prisma.task.upsert).not.toHaveBeenCalled();
    expect(prisma.task.delete).not.toHaveBeenCalled();
    expect(prisma.participationResponse.create).not.toHaveBeenCalled();
    expect(prisma.participationResponse.update).not.toHaveBeenCalled();
    expect(prisma.participationResponse.upsert).not.toHaveBeenCalled();
    expect(prisma.participationResponse.delete).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("25 — subject exposes only personId and displayName", async () => {
    mockMatchEvent();
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([CHILD]);

    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: "guardian-a",
      permissionKeys: [],
      now: NOW,
    });

    const subject = actions[0].subject!;
    expect(Object.keys(subject).sort()).toEqual(["displayName", "personId"]);
  });

  it("29 — only TASK and ATTENDANCE_RESPONSE sources are registered", () => {
    expect(personalActionSources.map((s) => s.sourceType)).toEqual([
      "TASK",
      "ATTENDANCE_RESPONSE",
    ]);
  });

  it("28 — source failure propagates (no broadened fallback)", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockRejectedValue(new Error("auth failure"));
    await expect(
      loadPersonalActions({
        tenantId: TENANT,
        userId: "guardian-a",
        permissionKeys: [],
        now: NOW,
      }),
    ).rejects.toThrow("auth failure");
  });
});
