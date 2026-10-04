/**
 * SCE-PLANNER-UX-08-04 — activity rescheduling validate authorization
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
  return new NextRequest("http://localhost/api/planning-hub/activity-rescheduling/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/planning-hub/activity-rescheduling/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAnyPermission.mockResolvedValue(makeAuthOk());
    mocks.resolveLiveManipulationActorPermissions.mockResolvedValue({
      canManageTrainings: true,
      canManageEvents: false,
      canManageAllocations: false,
    });
  });

  it("rejects cross-tenant activity draft", async () => {
    const res = await POST(
      makeRequest({
        draft: {
          itemId: TRAINING_ITEM.id,
          item: { ...TRAINING_ITEM, tenantId: "tenant-other" },
          originalStart: TRAINING_ITEM.startAt,
          originalEnd: TRAINING_ITEM.endAt,
          proposedStart: "2026-09-20T16:00:00.000Z",
          proposedEnd: "2026-09-20T17:30:00.000Z",
          manipulationType: "move",
          timeTarget: "activity",
        },
        allItems: [TRAINING_ITEM],
        resourceCategory: "pitch",
        isStandardplan: true,
        alternativePlanId: null,
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects activity-time mutation without trainings manage", async () => {
    mocks.resolveLiveManipulationActorPermissions.mockResolvedValue({
      canManageTrainings: false,
      canManageEvents: false,
      canManageAllocations: true,
    });
    const res = await POST(
      makeRequest({
        draft: {
          itemId: TRAINING_ITEM.id,
          item: TRAINING_ITEM,
          originalStart: TRAINING_ITEM.startAt,
          originalEnd: TRAINING_ITEM.endAt,
          proposedStart: "2026-09-20T16:00:00.000Z",
          proposedEnd: "2026-09-20T17:30:00.000Z",
          manipulationType: "move",
          timeTarget: "activity",
        },
        allItems: [TRAINING_ITEM],
        resourceCategory: "pitch",
        isStandardplan: true,
        alternativePlanId: null,
      }),
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Berechtigung");
  });
});
