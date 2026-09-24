import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PersonalContext } from "@/lib/dashboard/personal-context";

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
    tenant: [PERMISSIONS.EVENTS_VIEW, PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.MEETINGS_VIEW],
  }),
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: vi.fn(() => true),
}));

import { prisma } from "@/lib/db/prisma";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { loadPersonalProgramme } from "../load-personal-programme";
import { loadTeamEventProgrammeItems } from "../adapters/team-event-programme-adapter";
import { loadMeetingProgrammeItems } from "../adapters/meeting-programme-adapter";
import { resolvePersonalProgrammeRange, DEFAULT_PERSONAL_PROGRAMME_FORWARD_DAYS } from "../programme-range";
import { personalProgrammeDayKey, groupPersonalProgrammeItemsByDay } from "../programme-day-key";
import { sortPersonalProgrammeItems } from "../programme-sort";
import { canIncludeEventInPersonalProjection } from "../event-projection-access";
import { canIncludeMeetingInPersonalProgramme } from "../meeting-projection-access";

function buildContext(overrides: Partial<PersonalContext> = {}): PersonalContext {
  return {
    tenantId: "tenant-a",
    userId: "user-a",
    personId: "person-a",
    hasLinkedPerson: true,
    hasActiveTenantMembership: true,
    teams: [
      {
        teamId: "team-1",
        teamName: "Team Alpha",
        kinds: ["TRAINER"],
        assignmentFunctionKeys: [],
        teamSeasonIds: ["ts-team-1"],
      },
    ],
    orgUnits: [],
    assignments: [],
    ...overrides,
  };
}

const adapterCtx = (ctx: PersonalContext) => ({
  personal: ctx,
  permissionKeys: [PERMISSIONS.EVENTS_VIEW, PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.MEETINGS_VIEW],
  timeZone: "Europe/Zurich",
  rangeStart: new Date("2026-10-01T00:00:00.000Z"),
  rangeEnd: new Date("2026-10-31T23:59:59.999Z"),
});

describe("DASHBOARD-02 — personal programme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolvePersonalContext).mockResolvedValue(buildContext());
    vi.mocked(prisma.meeting.findMany).mockResolvedValue([] as never);
    vi.mocked(canSeeMeeting).mockReturnValue(true);
    vi.mocked(listTrainingSessions).mockResolvedValue([]);
  });

  describe("TRAINING", () => {
    it("includes related authorized training", async () => {
      vi.mocked(listTrainingSessions).mockResolvedValue([
        {
          id: "sess-tr",
          tenantId: "tenant-a",
          trainingSeriesId: "series-1",
          trainingSeriesTitle: "Abendtraining",
          teamSeasonId: "ts-team-1",
          teamName: "Team Alpha",
          date: "2026-10-02",
          weekday: "FRIDAY",
          startAt: "2026-10-02T16:00:00.000Z",
          endAt: "2026-10-02T17:30:00.000Z",
          timezone: "Europe/Zurich",
          status: "SCHEDULED",
          originalDate: "2026-10-02",
          originalStartAt: "2026-10-02T16:00:00.000Z",
          originalEndAt: "2026-10-02T17:30:00.000Z",
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
        },
      ]);

      const { loadTrainingProgrammeItems } = await import("../adapters/training-programme-adapter");
      const items = await loadTrainingProgrammeItems(adapterCtx(buildContext()));
      expect(items).toHaveLength(1);
      expect(items[0].sourceType).toBe("TRAINING");
      expect(items[0].title).toBe("Abendtraining");
    });

    it("excludes unrelated team training", async () => {
      vi.mocked(listTrainingSessions).mockResolvedValue([
        {
          id: "sess-other",
          tenantId: "tenant-a",
          trainingSeriesId: "series-x",
          trainingSeriesTitle: "Secret",
          teamSeasonId: "ts-other",
          teamName: "Other",
          date: "2026-10-02",
          weekday: "FRIDAY",
          startAt: "2026-10-02T16:00:00.000Z",
          endAt: null,
          timezone: "Europe/Zurich",
          status: "SCHEDULED",
          originalDate: "2026-10-02",
          originalStartAt: "2026-10-02T16:00:00.000Z",
          originalEndAt: "2026-10-02T17:30:00.000Z",
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
        },
      ] as never);

      const { loadTrainingProgrammeItems } = await import("../adapters/training-programme-adapter");
      const items = await loadTrainingProgrammeItems(adapterCtx(buildContext()));
      expect(items).toHaveLength(0);
      expect(JSON.stringify(items)).not.toContain("Secret");
    });

    it("excludes training when actor lacks trainings.view (zero disclosure)", async () => {
      vi.mocked(listTrainingSessions).mockResolvedValue([
        {
          id: "sess-draft",
          tenantId: "tenant-a",
          trainingSeriesId: "series-1",
          trainingSeriesTitle: "Draft Training Title",
          teamSeasonId: "ts-team-1",
          teamName: "Team Alpha",
          date: "2026-10-02",
          weekday: "FRIDAY",
          startAt: "2026-10-02T16:00:00.000Z",
          endAt: null,
          timezone: "Europe/Zurich",
          status: "SCHEDULED",
          originalDate: "2026-10-02",
          originalStartAt: "2026-10-02T16:00:00.000Z",
          originalEndAt: "2026-10-02T17:30:00.000Z",
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
        },
      ] as never);

      const { loadTrainingProgrammeItems } = await import("../adapters/training-programme-adapter");
      const items = await loadTrainingProgrammeItems({
        ...adapterCtx(buildContext()),
        permissionKeys: [PERMISSIONS.MEETINGS_VIEW],
      });
      expect(items).toHaveLength(0);
      expect(JSON.stringify(items)).not.toContain("Draft");
    });
  });

  describe("MATCH", () => {
    it("includes related authorized match with opponent title", async () => {
      vi.mocked(prisma.event.findMany).mockResolvedValue([
        {
          id: "evt-m",
          tenantId: "tenant-a",
          teamId: "team-1",
          teamSeasonId: "ts-team-1",
          type: "MATCH",
          status: "SCHEDULED",
          reviewStage: "PUBLISHED",
          title: "ignored",
          startAt: new Date("2026-10-03T14:00:00.000Z"),
          endAt: null,
          allDay: false,
          opponentName: "Guest FC",
          homeAway: "HOME",
          location: "Sportplatz",
          pitchCode: null,
          team: { name: "Team Alpha" },
        },
      ] as never);

      const items = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
      expect(items[0].sourceType).toBe("MATCH");
      expect(items[0].title).toContain("Guest FC");
      expect(items[0].homeAway).toBe("HOME");
    });

    it("does not treat broad permission without team relationship as relevance", async () => {
      vi.mocked(prisma.event.findMany).mockResolvedValue([]);
      const items = await loadTeamEventProgrammeItems(
        adapterCtx(buildContext({ teams: [], hasLinkedPerson: false, personId: null })),
      );
      expect(items).toEqual([]);
    });
  });

  describe("TOURNAMENT", () => {
    it("includes related authorized tournament", async () => {
      vi.mocked(prisma.event.findMany).mockResolvedValue([
        {
          id: "evt-t",
          tenantId: "tenant-a",
          teamId: "team-1",
          teamSeasonId: "ts-team-1",
          type: "TOURNAMENT",
          status: "SCHEDULED",
          reviewStage: "APPROVED",
          title: "Hallenturnier",
          startAt: new Date("2026-10-04T09:00:00.000Z"),
          endAt: new Date("2026-10-04T18:00:00.000Z"),
          allDay: false,
          opponentName: null,
          homeAway: null,
          location: null,
          pitchCode: null,
          team: { name: "Team Alpha" },
        },
      ] as never);

      const items = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
      expect(items[0].sourceType).toBe("TOURNAMENT");
    });
  });

  describe("EVENT (OTHER)", () => {
    it("maps OTHER to EVENT source type when authorized", async () => {
      vi.mocked(prisma.event.findMany).mockResolvedValue([
        {
          id: "evt-v",
          tenantId: "tenant-a",
          teamId: "team-1",
          teamSeasonId: "ts-team-1",
          type: "OTHER",
          status: "SCHEDULED",
          reviewStage: "APPROVED",
          title: "Vereinsfest",
          startAt: new Date("2026-10-05T10:00:00.000Z"),
          endAt: null,
          allDay: true,
          opponentName: null,
          homeAway: null,
          location: "Clubhaus",
          pitchCode: null,
          team: { name: "Team Alpha" },
        },
      ] as never);

      const items = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
      expect(items[0].sourceType).toBe("EVENT");
    });
  });

  describe("MEETING", () => {
    const meetingRow = {
      id: "meet-1",
      tenantId: "tenant-a",
      slug: "vorstand-oktober",
      title: "Vorstandssitzung",
      meetingDate: new Date("2026-10-06T18:00:00.000Z"),
      location: "Sitzungszimmer",
      status: "PLANNED",
      visibilityScope: "ORGANISATION",
      createdByUserId: "other-user",
      visibleRoleRefs: null,
      visibleUserRefs: null,
      visibleTeamRefs: null,
      visibleOrgUnitRefs: null,
      visiblePersonRefs: null,
      visibleTargetGroupRefs: null,
    };

    it("includes participant meetings with authorization", async () => {
      vi.mocked(prisma.meeting.findMany)
        .mockResolvedValueOnce([meetingRow] as never)
        .mockResolvedValueOnce([] as never);

      const items = await loadMeetingProgrammeItems(adapterCtx(buildContext()));
      expect(items).toHaveLength(1);
      expect(items[0].contextLabel).toBe("Meeting · Teilnehmer");
    });

    it("includes organizer meetings", async () => {
      vi.mocked(prisma.meeting.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([{ ...meetingRow, createdByUserId: "user-a" }] as never);

      const items = await loadMeetingProgrammeItems(adapterCtx(buildContext()));
      expect(items[0].contextLabel).toBe("Meeting · Organisator");
    });

    it("excludes meetings when visibility authorization fails", async () => {
      vi.mocked(canSeeMeeting).mockReturnValue(false);
      vi.mocked(prisma.meeting.findMany)
        .mockResolvedValueOnce([meetingRow] as never)
        .mockResolvedValueOnce([] as never);

      const items = await loadMeetingProgrammeItems(adapterCtx(buildContext()));
      expect(items).toHaveLength(0);
      expect(JSON.stringify(items)).not.toContain("Vorstand");
    });

    it("excludes manage-only admin without participant/organizer relationship", async () => {
      vi.mocked(prisma.meeting.findMany).mockResolvedValue([] as never);
      const items = await loadMeetingProgrammeItems(adapterCtx(buildContext()));
      expect(items).toEqual([]);
      expect(prisma.meeting.findMany).toHaveBeenCalled();
    });
  });

  describe("cross-cutting", () => {
    it("dedupes duplicate meeting participant + organizer paths", async () => {
      const row = {
        id: "meet-dup",
        tenantId: "tenant-a",
        slug: "dup",
        title: "Dup Meeting",
        meetingDate: new Date("2026-10-07T10:00:00.000Z"),
        location: null,
        status: "PLANNED",
        visibilityScope: "ORGANISATION",
        createdByUserId: "user-a",
        visibleRoleRefs: null,
        visibleUserRefs: null,
        visibleTeamRefs: null,
        visibleOrgUnitRefs: null,
        visiblePersonRefs: null,
        visibleTargetGroupRefs: null,
      };
      vi.mocked(prisma.meeting.findMany)
        .mockResolvedValueOnce([row] as never)
        .mockResolvedValueOnce([row] as never);

      const items = await loadMeetingProgrammeItems(adapterCtx(buildContext()));
      expect(items).toHaveLength(1);
      expect(items[0].contextLabel).toBe("Meeting · Teilnehmer");
    });

    it("stable sort uses id tie-breaker at same timestamp", () => {
      const at = new Date("2026-10-08T12:00:00.000Z");
      const sorted = sortPersonalProgrammeItems([
        {
          id: "event:b",
          sourceType: "MATCH",
          startsAt: at,
          title: "B",
          deepLink: "/x",
          typeLabel: "Spiel",
          ariaLabel: "Spiel: B",
        },
        {
          id: "event:a",
          sourceType: "TRAINING",
          startsAt: at,
          title: "A",
          deepLink: "/y",
          typeLabel: "Training",
          ariaLabel: "Training: A",
        },
      ]);
      expect(sorted.map((i) => i.id)).toEqual(["event:a", "event:b"]);
    });

    it("shows cancelled events with presentation status", () => {
      const row = {
        id: "e-c",
        tenantId: "tenant-a",
        teamId: "team-1",
        type: "TRAINING" as const,
        status: "CANCELLED",
        reviewStage: "APPROVED" as const,
      };
      expect(canIncludeEventInPersonalProjection(
        { userId: "user-a", tenantId: "tenant-a", permissionKeys: [PERMISSIONS.TRAININGS_VIEW] },
        row,
      )).toBe(true);
    });

    it("default range spans 14 forward days", () => {
      const now = new Date("2026-10-01T10:00:00.000Z");
      const { rangeStart, rangeEnd } = resolvePersonalProgrammeRange({
        timeZone: "Europe/Zurich",
        now,
      });
      expect(rangeStart.getTime()).toBeLessThanOrEqual(now.getTime());
      const spanDays = (rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000);
      expect(spanDays).toBeGreaterThanOrEqual(DEFAULT_PERSONAL_PROGRAMME_FORWARD_DAYS);
    });

    it("tenant timezone day key avoids naive UTC truncation", () => {
      const key = personalProgrammeDayKey(
        new Date("2026-07-23T22:15:00.000Z"),
        "Europe/Zurich",
      );
      expect(key).toBe("2026-07-24");
    });

    it("loadPersonalProgramme returns empty programme without fallback club data", async () => {
      vi.mocked(resolvePersonalContext).mockResolvedValue(
        buildContext({ teams: [], hasLinkedPerson: false, personId: null }),
      );
      vi.mocked(prisma.event.findMany).mockResolvedValue([
        {
          id: "club-wide",
          tenantId: "tenant-a",
          teamId: "team-x",
          type: "MATCH",
          status: "SCHEDULED",
          reviewStage: "PUBLISHED",
          title: "Club Match",
          startAt: new Date("2026-10-02T12:00:00.000Z"),
          endAt: null,
          allDay: false,
          opponentName: "X",
          homeAway: null,
          location: null,
          pitchCode: null,
          team: { name: "X" },
        },
      ] as never);

      const result = await loadPersonalProgramme({
        tenantId: "tenant-a",
        userId: "user-a",
        timeZone: "Europe/Zurich",
      });
      expect(result.items).toEqual([]);
    });
  });

  describe("meeting authorization unit", () => {
    it("requires meetings.view permission", () => {
      expect(
        canIncludeMeetingInPersonalProgramme(
          { userId: "u", tenantId: "tenant-a", permissionKeys: [] },
          {
            id: "m",
            tenantId: "tenant-a",
            status: "PLANNED",
            visibilityScope: "ORGANISATION",
            createdByUserId: "u",
            visibleRoleRefs: null,
            visibleUserRefs: null,
            visibleTeamRefs: null,
            visibleOrgUnitRefs: null,
            visiblePersonRefs: null,
          },
        ),
      ).toBe(false);
    });
  });

  describe("day grouping", () => {
    it("groups programme items by tenant-local day", () => {
      const map = groupPersonalProgrammeItemsByDay(
        [
          {
            id: "event:1",
            sourceType: "TRAINING",
            startsAt: new Date("2026-07-23T22:15:00.000Z"),
            title: "Late",
            deepLink: "/x",
            typeLabel: "Training",
            ariaLabel: "Training: Late",
          },
        ],
        "Europe/Zurich",
      );
      expect(map.get("2026-07-24")).toHaveLength(1);
    });
  });
});
