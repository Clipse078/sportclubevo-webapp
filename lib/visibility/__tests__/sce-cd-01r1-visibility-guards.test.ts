import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActorContext } from "@/lib/visibility/actor-context";

const mocks = vi.hoisted(() => ({
  userHasVereinsleitungWorkspaceAccess: vi.fn(),
  meetingFindFirst: vi.fn(),
}));

vi.mock("@/lib/permissions/vereinsleitung-workspace-access", () => ({
  userHasVereinsleitungWorkspaceAccess: mocks.userHasVereinsleitungWorkspaceAccess,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meeting: { findFirst: mocks.meetingFindFirst },
    initiative: { findFirst: vi.fn() },
    target: { findFirst: vi.fn() },
    communicationTemplate: { findFirst: vi.fn() },
  },
}));

import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";

const actor: ActorContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  roleKeys: [],
  permissionKeys: ["meetings.view"],
  orgUnitIds: [],
  targetGroupIds: [],
};

describe("visibility guards VL gate (SCE-CD-01R1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userHasVereinsleitungWorkspaceAccess.mockResolvedValue(false);
  });

  it("denies meeting sub-resource access without VL membership", async () => {
    const result = await requireMeetingAccess({
      actor,
      id: "meeting-1",
      access: "read",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
    expect(mocks.meetingFindFirst).not.toHaveBeenCalled();
  });
});
