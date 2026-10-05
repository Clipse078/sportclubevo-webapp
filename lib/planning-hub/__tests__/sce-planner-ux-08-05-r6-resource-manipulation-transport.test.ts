/**
 * SCE-PLANNER-UX-08-05R6 — JSON transport must revive week item dates before
 * resource-manipulation validation (Human UAT: E.getTime is not a function).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/planning-hub/resource-manipulation/validate/route";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  resolveLiveManipulationActorPermissions: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

vi.mock("@/lib/planning-hub/manipulation-live-permissions", () => ({
  resolveLiveManipulationActorPermissions: mocks.resolveLiveManipulationActorPermissions,
}));

function makeAuthOk() {
  return {
    ok: true as const,
    status: 200,
    error: null,
    session: {
      user: {
        id: "u1",
        effectiveUserId: "u1",
        activeTenantId: "tenant-a",
      },
    },
  };
}

const KUNSTRASEN_2_A = {
  facilityResourceId: "pitch-kr2-a",
  facilityId: "fac-kr2",
  code: "KR2-A",
  name: "A",
  facilityName: "Kunstrasen 2",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const HAUPTFELD_A = {
  facilityResourceId: "pitch-hf-a",
  facilityId: "fac-hf",
  code: "HF-A",
  name: "A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function trainingItem(overrides: {
  id: string;
  sessionId: string;
  title: string;
  pitch: typeof KUNSTRASEN_2_A;
}): WeekplannerItem {
  return {
    id: overrides.id,
    tenantId: "tenant-a",
    type: "TRAINING",
    trainingSessionId: overrides.sessionId,
    trainingSeriesId: `series-${overrides.sessionId}`,
    teamSeasonId: "team-season-1",
    startAt: new Date("2026-09-17T15:00:00.000Z"),
    endAt: new Date("2026-09-17T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-09-17T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-17T16:30:00.000Z"),
    timeOverridden: false,
    title: overrides.title,
    teamNames: [overrides.title],
    pitchAllocations: [overrides.pitch],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [overrides.pitch],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/planning-hub/resource-manipulation/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("SCE-PLANNER-UX-08-05R6 resource-manipulation transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAnyPermission.mockResolvedValue(makeAuthOk());
    mocks.resolveLiveManipulationActorPermissions.mockResolvedValue({
      canManageTrainings: true,
      canManageEvents: false,
      canManageAllocations: false,
    });
  });

  it("MOVE_RESOURCE JSON payload succeeds after ISO revival (F2 Kunstrasen → Hauptfeld)", async () => {
    const f1 = trainingItem({
      id: "training:f1",
      sessionId: "session-f1",
      title: "Junioren F1",
      pitch: KUNSTRASEN_2_A,
    });
    const f2 = trainingItem({
      id: "training:f2",
      sessionId: "session-f2",
      title: "Junioren F2",
      pitch: KUNSTRASEN_2_A,
    });

    const reservationStart = "2026-09-17T15:00:00.000Z";
    const reservationEnd = "2026-09-17T16:30:00.000Z";

    const clientPayload = {
      draft: {
        itemId: f2.id,
        segmentId: KUNSTRASEN_2_A.facilityResourceId,
        item: f2,
        originalStart: reservationStart,
        originalEnd: reservationEnd,
        proposedStart: reservationStart,
        proposedEnd: reservationEnd,
        originalResourceId: KUNSTRASEN_2_A.facilityResourceId,
        proposedResourceId: HAUPTFELD_A.facilityResourceId,
        manipulationType: "move",
        timeTarget: "resourceOccupancy",
      },
      allItems: [f1, f2],
      resourceCategory: "pitch",
      targetResource: HAUPTFELD_A,
    };

    const res = await POST(makeRequest(JSON.parse(JSON.stringify(clientPayload)) as Record<string, unknown>));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { preview: { status: string; message: string } };
    expect(json.preview.status).toBe("valid");
    expect(json.preview.message).toContain("Keine neuen Ressourcenkonflikte");
  });

  it("rejects invalid draft instants with 400 instead of 500", async () => {
    const item = trainingItem({
      id: "training:f2",
      sessionId: "session-f2",
      title: "Junioren F2",
      pitch: KUNSTRASEN_2_A,
    });

    const res = await POST(
      makeRequest({
        draft: {
          itemId: item.id,
          item,
          originalStart: "not-a-date",
          originalEnd: item.endAt.toISOString(),
          proposedStart: item.startAt.toISOString(),
          proposedEnd: item.endAt.toISOString(),
          manipulationType: "move",
          timeTarget: "resourceOccupancy",
        },
        allItems: [item],
        resourceCategory: "pitch",
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Ungültiges Datum");
  });
});
