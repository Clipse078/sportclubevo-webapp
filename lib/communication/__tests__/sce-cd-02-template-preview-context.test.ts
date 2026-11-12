import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActorContext } from "@/lib/visibility/actor-context";

const mocks = vi.hoisted(() => ({
  userHasVereinsleitungWorkspaceAccess: vi.fn(),
  getMeetingById: vi.fn(),
  getTargetById: vi.fn(),
  getInitiativeById: vi.fn(),
}));

vi.mock("@/lib/permissions/vereinsleitung-workspace-access", () => ({
  userHasVereinsleitungWorkspaceAccess: mocks.userHasVereinsleitungWorkspaceAccess,
}));

vi.mock("@/lib/meetings/queries", () => ({
  getMeetingById: mocks.getMeetingById,
}));

vi.mock("@/lib/targets/queries", () => ({
  getTargetById: mocks.getTargetById,
}));

vi.mock("@/lib/initiatives/queries", () => ({
  getInitiativeById: mocks.getInitiativeById,
}));

import { resolveContext } from "@/lib/communication/context-resolver";

const actor: ActorContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  roleKeys: [],
  permissionKeys: ["templates.view", "meetings.view"],
  orgUnitIds: [],
  targetGroupIds: [],
};

describe("SCE-CD-02 template preview context resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userHasVereinsleitungWorkspaceAccess.mockResolvedValue(true);
  });

  it("returns empty context when actor lacks Vereinsleitung workspace access", async () => {
    mocks.userHasVereinsleitungWorkspaceAccess.mockResolvedValue(false);
    mocks.getMeetingById.mockResolvedValue({
      title: "Geheime Sitzung",
      meetingDate: new Date("2026-06-01T18:00:00.000Z"),
      location: "Clubhaus",
      description: "Vertraulich",
    });

    const ctx = await resolveContext("meetings", "meeting-1", actor);

    expect(ctx).toEqual({});
    expect(mocks.getMeetingById).not.toHaveBeenCalled();
  });

  it("returns empty context when meeting is not visible to actor (404-mask)", async () => {
    mocks.getMeetingById.mockResolvedValue(null);

    const ctx = await resolveContext("meeting", "meeting-hidden", actor);

    expect(ctx).toEqual({});
    expect(mocks.getMeetingById).toHaveBeenCalledWith("meeting-hidden", actor);
  });

  it("resolves meeting fields only for authorized visible meetings", async () => {
    mocks.getMeetingById.mockResolvedValue({
      title: "Vorstand",
      meetingDate: new Date("2026-06-01T18:00:00.000Z"),
      location: "Sitzungszimmer",
      description: "Protokoll",
    });

    const ctx = await resolveContext("meetings", "meeting-ok", actor);

    expect(ctx["meeting.title"]).toBe("Vorstand");
    expect(ctx["meeting.location"]).toBe("Sitzungszimmer");
    expect(ctx["meeting.description"]).toBe("Protokoll");
    expect(ctx["meeting.date"]).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it("does not resolve target context without visibility", async () => {
    mocks.getTargetById.mockResolvedValue(null);
    const ctx = await resolveContext("target", "target-1", actor);
    expect(ctx).toEqual({});
  });

  it("does not resolve initiative context without visibility", async () => {
    mocks.getInitiativeById.mockResolvedValue(null);
    const ctx = await resolveContext("initiative", "init-1", actor);
    expect(ctx).toEqual({});
  });
});
