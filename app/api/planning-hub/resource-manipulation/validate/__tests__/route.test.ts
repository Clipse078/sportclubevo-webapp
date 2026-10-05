/**
 * SCE-PLANNER-UX-08-04 — resource manipulation validate authorization
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

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

const TRAINING_ITEM = {
  id: "training:t1",
  tenantId: "tenant-a",
  type: "TRAINING" as const,
  startAt: "2026-09-20T15:00:00.000Z",
  endAt: "2026-09-20T16:30:00.000Z",
  canonicalStartAt: "2026-09-20T15:00:00.000Z",
  canonicalEndAt: "2026-09-20T16:30:00.000Z",
  timeOverridden: false,
  title: "Training",
  teamNames: ["F2"],
  pitchAllocations: [],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  conflicts: [],
  trainingSeriesId: "s1",
  trainingSessionId: "sess-1",
  teamSeasonId: "ts1",
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/planning-hub/resource-manipulation/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/planning-hub/resource-manipulation/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAnyPermission.mockResolvedValue(makeAuthOk());
    mocks.resolveLiveManipulationActorPermissions.mockResolvedValue({
      canManageTrainings: true,
      canManageEvents: false,
      canManageAllocations: false,
    });
  });

  it("rejects activity-time drafts", async () => {
    const res = await POST(
      makeRequest({
        draft: {
          itemId: TRAINING_ITEM.id,
          item: TRAINING_ITEM,
          originalStart: TRAINING_ITEM.startAt,
          originalEnd: TRAINING_ITEM.endAt,
          proposedStart: TRAINING_ITEM.startAt,
          proposedEnd: TRAINING_ITEM.endAt,
          manipulationType: "move",
          timeTarget: "activity",
        },
        allItems: [TRAINING_ITEM],
        resourceCategory: "pitch",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects cross-tenant payload", async () => {
    const res = await POST(
      makeRequest({
        draft: {
          itemId: TRAINING_ITEM.id,
          item: { ...TRAINING_ITEM, tenantId: "tenant-other" },
          originalStart: TRAINING_ITEM.startAt,
          originalEnd: TRAINING_ITEM.endAt,
          proposedStart: TRAINING_ITEM.startAt,
          proposedEnd: TRAINING_ITEM.endAt,
          manipulationType: "move",
          timeTarget: "resourceOccupancy",
        },
        allItems: [TRAINING_ITEM],
        resourceCategory: "pitch",
      }),
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Berechtigung");
  });

  it("accepts JSON-serialized week items for resourceOccupancy MOVE_RESOURCE", async () => {
    const pitchA = {
      facilityResourceId: "pitch-a",
      facilityId: "fac-1",
      code: "A",
      name: "A",
      facilityName: "Platz",
      resourceType: "HALF_PITCH" as const,
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    };
    const pitchB = {
      ...pitchA,
      facilityResourceId: "pitch-b",
      code: "B",
      name: "B",
    };
    const item = {
      ...TRAINING_ITEM,
      pitchAllocations: [pitchA],
      canonicalPitchAllocations: [pitchA],
      dressingRoomOccupancyMode: "DEFAULT" as const,
      dressingRoomOccupancyBeforeMinutes: null,
      dressingRoomOccupancyAfterMinutes: null,
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
    };
    const res = await POST(
      makeRequest(
        JSON.parse(
          JSON.stringify({
            draft: {
              itemId: item.id,
              item,
              originalStart: item.startAt,
              originalEnd: item.endAt,
              proposedStart: item.startAt,
              proposedEnd: item.endAt,
              originalResourceId: pitchA.facilityResourceId,
              proposedResourceId: pitchB.facilityResourceId,
              manipulationType: "move",
              timeTarget: "resourceOccupancy",
            },
            allItems: [item],
            resourceCategory: "pitch",
            targetResource: pitchB,
          }),
        ),
      ),
    );
    expect(res.status).toBe(200);
  });

  it("rejects resource mutation without domain permission", async () => {
    mocks.resolveLiveManipulationActorPermissions.mockResolvedValue({
      canManageTrainings: false,
      canManageEvents: false,
      canManageAllocations: false,
    });
    const res = await POST(
      makeRequest({
        draft: {
          itemId: TRAINING_ITEM.id,
          item: TRAINING_ITEM,
          originalStart: TRAINING_ITEM.startAt,
          originalEnd: TRAINING_ITEM.endAt,
          proposedStart: TRAINING_ITEM.startAt,
          proposedEnd: TRAINING_ITEM.endAt,
          manipulationType: "move",
          timeTarget: "resourceOccupancy",
        },
        allItems: [TRAINING_ITEM],
        resourceCategory: "pitch",
      }),
    );
    expect(res.status).toBe(403);
  });
});
