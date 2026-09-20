import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/participation/authorization", () => ({
  getAuthorizedPersonIdsForUser: vi.fn(),
}));

vi.mock("../sources/attendance-obligations", () => ({
  loadAttendanceObligationCandidates: vi.fn(),
  filterActionableAttendanceCandidates: vi.fn((rows: unknown[]) => rows),
}));

import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import {
  loadAttendanceObligationCandidates,
} from "../sources/attendance-obligations";
import { attendancePersonalActionSource } from "../sources/attendance-source";

const ctx = {
  tenantId: "tenant-a",
  userId: "guardian-user",
  permissionKeys: [],
  now: new Date("2026-09-20T12:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-1"]);
});

describe("AUFGABEN-05 — attendance PersonalAction source", () => {
  it("S — attendance dueAt stays null", async () => {
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Heimspiel",
        eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
    ]);

    const actions = await attendancePersonalActionSource.loadActionable(ctx);
    expect(actions[0].dueAt).toBeNull();
    expect(actions[0].context?.eventStartAt).toBe("2026-09-25T18:00:00.000Z");
  });

  it("stable id does not require ParticipationResponse row", async () => {
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "TRAINING",
        trainingSessionId: "session-1",
        eventTitle: "Training",
        eventStartAt: new Date("2026-09-22T17:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
    ]);

    const actions = await attendancePersonalActionSource.loadActionable(ctx);
    expect(actions[0].id).toBe("participation:child-1:TRAINING:session-1");
    expect(actions[0].sourceId).toBeNull();
  });

  it("27 — exposes participation inline metadata with YES/NO capability", async () => {
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Heimspiel",
        eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
        responseId: "resp-1",
        responseStatus: "OPEN",
      },
    ]);

    const actions = await attendancePersonalActionSource.loadActionable(ctx);
    expect(actions[0].actionKind).toBe("PARTICIPATION_RESPONSE");
    expect(actions[0].inlineActions?.participation?.allowedResponses).toEqual(["YES", "NO"]);
  });

  it("C — runs without tasks.view permission keys", async () => {
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([]);
    await attendancePersonalActionSource.loadActionable({
      ...ctx,
      permissionKeys: [],
    });
    expect(getAuthorizedPersonIdsForUser).toHaveBeenCalledWith("tenant-a", "guardian-user");
  });
});
