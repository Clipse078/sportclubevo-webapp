/**
 * SCE-COLLAB-01D-R1 — performance + scope remediation tests.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import {
  getMultiActivityDispatchPreviewCallCountForTests,
  resetMultiActivityDispatchPreviewCallCountForTests,
  resolveMultiActivityTrainingDispatchPreview,
  resolveMultiActivityTrainingDispatchPreviewByAudienceGroups,
} from "@/lib/collaboration/multi-activity/multi-activity-dispatch-preview";
import { defaultTeamOperationalAudience } from "@/lib/communication/platform/seams/team-communication-seam";

const mocks = vi.hoisted(() => ({
  resolveCommunicationRecipients: vi.fn(),
  loadTrainingSeriesActivitySnapshots: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: mocks.resolveCommunicationRecipients,
}));

vi.mock("@/lib/collaboration/training/load-training-series-activity-snapshots", () => ({
  loadTrainingSeriesActivitySnapshots: mocks.loadTrainingSeriesActivitySnapshots,
}));

vi.mock("@/lib/collaboration/contextual-communication-authorization", () => ({
  resolveContextualCommunicationSendAuthorization: mocks.resolveContextualCommunicationSendAuthorization,
}));

import { buildTrainingSeriesMutationCollaborationImpact } from "@/lib/collaboration/training/training-series-mutation-collaboration";

function snapshot(
  sessionId: string,
  startTime: string,
  teamId = "team-1",
): TrainingActivitySnapshot {
  return {
    sessionId,
    tenantId: "tenant-1",
    teamId,
    teamName: "Team",
    teamSeasonId: "ts-1",
    title: "Training",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-19",
    startTime,
    endTime: "20:15",
    playableVenueLabel: null,
    dressingRoomLabel: null,
    scheduleLine: `2026-10-19 · ${startTime}–20:15`,
  };
}

describe("SCE-COLLAB-01D-R1 COMM-03 deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMultiActivityDispatchPreviewCallCountForTests();
    mocks.resolveCommunicationRecipients.mockResolvedValue({
      summary: { effectiveCount: 4 },
      effectiveRecipientPersonIds: ["p1", "p2", "p3", "p4"],
    });
  });

  it("B — 50 session ids with one team audience → one PREVIEW resolver call", async () => {
    const sessionIds = Array.from({ length: 50 }, (_, i) => `session-${i}`);
    await resolveMultiActivityTrainingDispatchPreview({
      tenantId: "tenant-1",
      senderUserId: "user-1",
      sessionIds,
      audience: defaultTeamOperationalAudience("team-1"),
    });
    expect(mocks.resolveCommunicationRecipients).toHaveBeenCalledTimes(1);
    expect(getMultiActivityDispatchPreviewCallCountForTests()).toBe(1);
  });

  it("C — two distinct team audiences → two PREVIEW resolver calls", async () => {
    await resolveMultiActivityTrainingDispatchPreviewByAudienceGroups({
      tenantId: "tenant-1",
      senderUserId: "user-1",
      groups: [
        {
          audienceKey: "team-a",
          audience: defaultTeamOperationalAudience("team-a"),
          sessionIds: ["s1", "s2"],
        },
        {
          audienceKey: "team-b",
          audience: defaultTeamOperationalAudience("team-b"),
          sessionIds: ["s3"],
        },
      ],
    });
    expect(mocks.resolveCommunicationRecipients).toHaveBeenCalledTimes(2);
  });

  it("D — duplicate recipients across audiences union to unique count", async () => {
    mocks.resolveCommunicationRecipients
      .mockResolvedValueOnce({
        summary: { effectiveCount: 2 },
        effectiveRecipientPersonIds: ["p1", "p2"],
      })
      .mockResolvedValueOnce({
        summary: { effectiveCount: 2 },
        effectiveRecipientPersonIds: ["p2", "p3"],
      });

    const preview = await resolveMultiActivityTrainingDispatchPreviewByAudienceGroups({
      tenantId: "tenant-1",
      senderUserId: "user-1",
      groups: [
        {
          audienceKey: "team-a",
          audience: defaultTeamOperationalAudience("team-a"),
          sessionIds: ["s1"],
        },
        {
          audienceKey: "team-b",
          audience: defaultTeamOperationalAudience("team-b"),
          sessionIds: ["s2"],
        },
      ],
    });
    expect(preview.recipientCount).toBe(3);
  });
});

describe("SCE-COLLAB-01D-R1 grouped impact scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMultiActivityDispatchPreviewCallCountForTests();
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.resolveCommunicationRecipients.mockResolvedValue({
      summary: { effectiveCount: 2 },
      effectiveRecipientPersonIds: ["p1", "p2"],
    });
  });

  it("E/F — excludes unchanged sessions from grouped impact", async () => {
    const before = new Map<string, TrainingActivitySnapshot>([
      ["s1", snapshot("s1", "18:45")],
      ["s2", snapshot("s2", "18:45")],
    ]);
    mocks.loadTrainingSeriesActivitySnapshots.mockResolvedValue(
      new Map([
        ["s1", snapshot("s1", "19:00")],
        ["s2", snapshot("s2", "18:45")],
      ]),
    );

    const grouped = await buildTrainingSeriesMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fc-allschwil",
      userId: "user-1",
      trainingSeriesId: "series-1",
      beforeSnapshots: before,
    });

    expect(grouped?.activityCount).toBe(1);
    expect(grouped?.items[0]?.activityId).toBe("s1");
    expect(mocks.resolveCommunicationRecipients).toHaveBeenCalledTimes(1);
  });

  it("H — includes future changed sessions in grouped impact", async () => {
    const ids = Array.from({ length: 52 }, (_, i) => `s${i}`);
    const before = new Map(
      ids.map((id) => [id, snapshot(id, "18:45")]),
    );
    const after = new Map(
      ids.map((id) => [id, snapshot(id, "19:00")]),
    );
    mocks.loadTrainingSeriesActivitySnapshots.mockResolvedValue(after);

    const grouped = await buildTrainingSeriesMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fc-allschwil",
      userId: "user-1",
      trainingSeriesId: "series-1",
      beforeSnapshots: before,
    });

    expect(grouped?.activityCount).toBe(52);
    expect(mocks.resolveCommunicationRecipients).toHaveBeenCalledTimes(1);
  });

  it("I — collaboration assembly failure returns null without throwing", async () => {
    mocks.loadTrainingSeriesActivitySnapshots.mockRejectedValue(new Error("boom"));
    const grouped = await buildTrainingSeriesMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fc-allschwil",
      userId: "user-1",
      trainingSeriesId: "series-1",
      beforeSnapshots: new Map([["s1", snapshot("s1", "18:45")]]),
    });
    expect(grouped).toBeNull();
  });
});
