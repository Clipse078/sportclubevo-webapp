import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PersonalContext } from "@/lib/dashboard/personal-context";
import type { TrainingSessionDto } from "@/lib/training/types";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn() },
    meeting: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/training/session-generation-service", () => ({
  listTrainingSessions: vi.fn(),
}));

vi.mock("@/lib/dashboard/personal-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dashboard/personal-context")>();
  return {
    ...actual,
    resolvePersonalContext: vi.fn(),
  };
});

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn().mockResolvedValue({
    platform: [],
    tenant: [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW, PERMISSIONS.MEETINGS_VIEW],
  }),
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: vi.fn(() => true),
}));

import { prisma } from "@/lib/db/prisma";
import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { loadPersonalProgramme } from "../load-personal-programme";
import { loadTrainingProgrammeItems } from "../adapters/training-programme-adapter";
import { loadTeamEventProgrammeItems } from "../adapters/team-event-programme-adapter";
import { personalProgrammeItemsToCalendarItems } from "../programme-to-calendar";
import { assertPersonalProgrammeCalendarParity } from "../personal-programme-universe";
import { getProgrammeSourcePresentation } from "../programme-source-presentation";

const TIME_ZONE = "Europe/Zurich";
const F2_TEAM = "team-f2";
const F2_TS = "ts-f2-2026";
const OTHER_TS = "ts-other-2026";

function buildF2TrainerContext(overrides: Partial<PersonalContext> = {}): PersonalContext {
  return {
    tenantId: "tenant-fca",
    userId: "user-fca",
    personId: "person-fca",
    hasLinkedPerson: true,
    hasActiveTenantMembership: true,
    teams: [
      {
        teamId: F2_TEAM,
        teamName: "Junioren F2",
        kinds: ["PERSON_ASSIGNMENT", "TRAINER"],
        assignmentFunctionKeys: ["TRAINER"],
        teamSeasonIds: [F2_TS],
      },
    ],
    orgUnits: [],
    assignments: [],
    ...overrides,
  };
}

function trainingDto(overrides: Partial<TrainingSessionDto> = {}): TrainingSessionDto {
  return {
    id: "sess-mon",
    tenantId: "tenant-fca",
    trainingSeriesId: "series-f2",
    trainingSeriesTitle: "Training",
    teamSeasonId: F2_TS,
    teamName: "Junioren F2",
    date: "2026-09-21",
    weekday: "MONDAY",
    startAt: "2026-09-21T16:00:00.000Z",
    endAt: "2026-09-21T17:30:00.000Z",
    timezone: "Europe/Zurich",
    status: "SCHEDULED",
    originalDate: "2026-09-21",
    originalStartAt: "2026-09-21T16:00:00.000Z",
    originalEndAt: "2026-09-21T17:30:00.000Z",
    isRescheduled: false,
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomBeforeMinutes: null,
    dressingRoomAfterMinutes: null,
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const adapterCtx = (ctx: PersonalContext) => ({
  personal: ctx,
  permissionKeys: [PERMISSIONS.TRAININGS_VIEW],
  timeZone: TIME_ZONE,
  rangeStart: new Date("2026-09-01T00:00:00.000+02:00"),
  rangeEnd: new Date("2026-09-30T23:59:59.999+02:00"),
});

describe("DASHBOARD-07R1D — personal trainings (canonical TrainingSession)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolvePersonalContext).mockResolvedValue(buildF2TrainerContext());
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.meeting.findMany).mockResolvedValue([] as never);
  });

  it("A — relevant trainer + personal training → visible with blue semantics", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([trainingDto()]);

    const items = await loadTrainingProgrammeItems(adapterCtx(buildF2TrainerContext()));
    expect(items).toHaveLength(1);
    expect(items[0].sourceType).toBe("TRAINING");
    expect(items[0].id).toBe("training-session:sess-mon");
    expect(getProgrammeSourcePresentation(items[0].sourceType).paletteKey).toBe("training-blue");
    expect(items[0].deepLink).toBe("/dashboard/training/sessions/sess-mon/edit");
  });

  it("B — unrelated team training → absent (zero metadata)", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([
      trainingDto({ id: "sess-secret", teamSeasonId: OTHER_TS, teamName: "Secret Team" }),
    ]);

    const items = await loadTrainingProgrammeItems(adapterCtx(buildF2TrainerContext()));
    expect(items).toHaveLength(0);
    expect(JSON.stringify(items)).not.toContain("Secret");
  });

  it("C/D — club admin / technical permission without relationship → absent", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([trainingDto({ id: "sess-x" })]);

    const noRelationship = buildF2TrainerContext({ teams: [] });
    const items = await loadTrainingProgrammeItems({
      ...adapterCtx(noRelationship),
      permissionKeys: [
        PERMISSIONS.TRAININGS_VIEW,
        PERMISSIONS.EVENTS_VIEW,
        PERMISSIONS.TRAININGS_MANAGE,
      ],
    });
    expect(items).toHaveLength(0);
  });

  it("E — multi-team trainer → union of relevant trainings", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([
      trainingDto({ id: "sess-f2" }),
      trainingDto({
        id: "sess-b",
        teamSeasonId: "ts-b-2026",
        startAt: "2026-09-23T16:00:00.000Z",
        endAt: "2026-09-23T17:30:00.000Z",
        date: "2026-09-23",
      }),
    ]);

    const ctx = buildF2TrainerContext({
      teams: [
        ...buildF2TrainerContext().teams,
        {
          teamId: "team-b",
          teamName: "Team B",
          kinds: ["TRAINER"],
          assignmentFunctionKeys: [],
          teamSeasonIds: ["ts-b-2026"],
        },
      ],
    });

    const items = await loadTrainingProgrammeItems(adapterCtx(ctx));
    expect(items.map((i) => i.id).sort()).toEqual(["training-session:sess-b", "training-session:sess-f2"]);
  });

  it("F — removed trainer relationship → future training absent", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([trainingDto()]);
    const items = await loadTrainingProgrammeItems(
      adapterCtx(buildF2TrainerContext({ teams: [] })),
    );
    expect(items).toHaveLength(0);
  });

  it("G — cross-tenant training row → absent", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([
      trainingDto({ tenantId: "tenant-other" }),
    ]);
    const items = await loadTrainingProgrammeItems(adapterCtx(buildF2TrainerContext()));
    expect(items).toHaveLength(0);
  });

  it("H — relevant training without domain read permission → absent", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([trainingDto()]);
    const items = await loadTrainingProgrammeItems({
      ...adapterCtx(buildF2TrainerContext()),
      permissionKeys: [PERMISSIONS.MEETINGS_VIEW],
    });
    expect(items).toHaveLength(0);
  });

  it("I — PersonAssignment-only trainer semantics use TeamSeason scope", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([trainingDto({ id: "sess-pa" })]);
    const items = await loadTrainingProgrammeItems(adapterCtx(buildF2TrainerContext()));
    expect(items).toHaveLength(1);
    expect(listTrainingSessions).toHaveBeenCalledWith(
      "tenant-fca",
      expect.objectContaining({ teamSeasonIds: [F2_TS] }),
    );
  });

  it("J — R1C SFV null-teamSeason match events remain absent", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "sfv-null",
        tenantId: "tenant-fca",
        teamId: F2_TEAM,
        teamSeasonId: null,
        type: "MATCH",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        title: "SFV Leak",
        startAt: new Date("2026-09-27T10:00:00.000Z"),
        endAt: null,
        allDay: false,
        opponentName: "X",
        homeAway: null,
        location: null,
        pitchCode: null,
        team: { name: "Junioren F2" },
      },
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(buildF2TrainerContext()));
    expect(items).toHaveLength(0);
    expect(JSON.stringify(items)).not.toContain("SFV");
  });

  it("K — Sep 27 F2 Blitzturnier (aligned teamSeason) still present alongside training", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([
      trainingDto({
        id: "sess-wed",
        date: "2026-09-24",
        startAt: "2026-09-24T16:00:00.000Z",
        endAt: "2026-09-24T17:30:00.000Z",
      }),
    ]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "blitz",
        tenantId: "tenant-fca",
        teamId: F2_TEAM,
        teamSeasonId: F2_TS,
        type: "TOURNAMENT",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        title: "Blitzturnier",
        startAt: new Date("2026-09-27T09:00:00.000Z"),
        endAt: null,
        allDay: false,
        opponentName: null,
        homeAway: null,
        location: null,
        pitchCode: null,
        team: { name: "Junioren F2" },
      },
    ] as never);

    const programme = await loadPersonalProgramme({
      tenantId: "tenant-fca",
      userId: "user-fca",
      timeZone: TIME_ZONE,
      from: new Date("2026-09-01T00:00:00.000+02:00"),
      to: new Date("2026-09-30T23:59:59.999+02:00"),
      permissionKeys: [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
    });

    expect(programme.items.some((i) => i.title === "Blitzturnier")).toBe(true);
    expect(programme.items.some((i) => i.sourceType === "TRAINING")).toBe(true);
    expect(getProgrammeSourcePresentation("TOURNAMENT").paletteKey).toBe("tournament-orange");
  });

  it("L — calendar parity uses the same training universe as programme items", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([
      trainingDto(),
      trainingDto({
        id: "sess-wed",
        date: "2026-09-23",
        startAt: "2026-09-23T16:00:00.000Z",
        endAt: "2026-09-23T17:30:00.000Z",
      }),
    ]);

    const programmeItems = await loadTrainingProgrammeItems(adapterCtx(buildF2TrainerContext()));
    expect(() =>
      assertPersonalProgrammeCalendarParity({
        programmeItems,
        calendarItems: programmeItems,
        timeZone: TIME_ZONE,
      }),
    ).not.toThrow();
    const calendarProjection = personalProgrammeItemsToCalendarItems(programmeItems);
    expect(calendarProjection.every((c) => c.sourceType === "TRAINING")).toBe(true);
  });

  it("uses one batched listTrainingSessions query (no per-team loop)", async () => {
    vi.mocked(listTrainingSessions).mockResolvedValue([]);
    await loadTrainingProgrammeItems(adapterCtx(buildF2TrainerContext()));
    expect(listTrainingSessions).toHaveBeenCalledTimes(1);
  });
});
