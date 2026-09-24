import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn() },
    meeting: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { loadPersonalCalendarEntryProjections } from "../calendar-entries";
import type { PersonalContext } from "@/lib/dashboard/personal-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function buildContext(overrides: Partial<PersonalContext> = {}): PersonalContext {
  return {
    tenantId: "tenant-a",
    userId: "user-a",
    personId: "person-a",
    hasLinkedPerson: true,
    hasActiveTenantMembership: true,
    teams: [
      {
        teamId: "team-f2",
        teamName: "F2",
        kinds: ["TRAINER"],
        assignmentFunctionKeys: [],
        teamSeasonIds: ["ts-f2"],
      },
    ],
    orgUnits: [],
    assignments: [],
    ...overrides,
  };
}

const actor = {
  userId: "user-a",
  tenantId: "tenant-a",
  permissionKeys: [PERMISSIONS.EVENTS_VIEW],
};

describe("DASHBOARD-01 — event zero disclosure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.meeting.findMany).mockResolvedValue([] as never);
  });

  it("excludes unauthorized event metadata entirely from projections", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "secret-event",
        tenantId: "tenant-a",
        teamId: "team-f2",
        type: "MATCH",
        status: "SCHEDULED",
        reviewStage: "DRAFT",
        title: "SECRET OPPONENT TITLE",
        startAt: new Date("2026-10-01T10:00:00.000Z"),
        endAt: null,
        allDay: false,
        opponentName: "Opponent FC",
        homeAway: null,
        location: null,
        pitchCode: null,
        team: { name: "F2" },
      },
    ] as never);

    const items = await loadPersonalCalendarEntryProjections({
      tenantId: "tenant-a",
      userId: "user-a",
      personalContext: buildContext(),
      actor,
      timeZone: "Europe/Zurich",
      rangeStart: new Date("2026-10-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-10-31T23:59:59.999Z"),
    });

    const serialized = JSON.stringify(items);
    expect(items).toHaveLength(0);
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toContain("Opponent");
    expect(serialized).not.toContain("secret-event");
  });

  it("includes authorized relevant team events once", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "evt-1",
        tenantId: "tenant-a",
        teamId: "team-f2",
        type: "TRAINING",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        title: "Training Abend",
        startAt: new Date("2026-10-01T18:00:00.000Z"),
        endAt: new Date("2026-10-01T19:30:00.000Z"),
        allDay: false,
        opponentName: null,
        homeAway: null,
        location: null,
        pitchCode: null,
        team: { name: "F2" },
      },
    ] as never);

    const items = await loadPersonalCalendarEntryProjections({
      tenantId: "tenant-a",
      userId: "user-a",
      personalContext: buildContext(),
      actor: {
        ...actor,
        permissionKeys: [PERMISSIONS.TRAININGS_VIEW],
      },
      timeZone: "Europe/Zurich",
      rangeStart: new Date("2026-10-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-10-31T23:59:59.999Z"),
    });

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Training Abend");
    expect(items[0].contextLabel).toBe("F2 · Trainer");
    expect(items[0].sourceType).toBe("TRAINING");
  });

  it("returns no team events when user has no personal team relationship", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "evt-club",
        tenantId: "tenant-a",
        teamId: "team-other",
        type: "MATCH",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        title: "Other team match",
        startAt: new Date("2026-10-02T10:00:00.000Z"),
        endAt: null,
        allDay: false,
        opponentName: "Guest",
        homeAway: null,
        location: null,
        pitchCode: null,
        team: { name: "U16" },
      },
    ] as never);

    const items = await loadPersonalCalendarEntryProjections({
      tenantId: "tenant-a",
      userId: "user-admin",
      personalContext: buildContext({ teams: [], hasLinkedPerson: false, personId: null }),
      actor,
      timeZone: "Europe/Zurich",
      rangeStart: new Date("2026-10-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-10-31T23:59:59.999Z"),
    });

    expect(items).toEqual([]);
    expect(prisma.event.findMany).not.toHaveBeenCalled();
  });
});
