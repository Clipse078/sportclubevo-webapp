/**
 * SCE-COLLAB-01D-R2 — composer prepare performance + semantic summarization.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ActivityChangeSet } from "@/lib/collaboration/activity-change/types";
import type { MultiActivityChangeSet } from "@/lib/collaboration/multi-activity/types";
import { buildMultiActivityBatchFingerprint } from "@/lib/collaboration/multi-activity/batch-fingerprint";
import { buildActivityChangeFingerprint } from "@/lib/collaboration/activity-change/fingerprint";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import {
  buildMultiTrainingCommunicationSummary,
  MULTI_ACTIVITY_COMMUNICATION_BODY_MAX_LINES,
} from "@/lib/collaboration/multi-activity/multi-activity-communication-summary";
import {
  getMultiActivityDispatchPreviewCallCountForTests,
  resetMultiActivityDispatchPreviewCallCountForTests,
} from "@/lib/collaboration/multi-activity/multi-activity-dispatch-preview";

const mocks = vi.hoisted(() => ({
  loadTrainingActivitySnapshot: vi.fn(),
  loadTrainingSeriesActivitySnapshots: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  platformCommunicationFindMany: vi.fn(),
}));

vi.mock("@/lib/collaboration/training/training-activity-snapshot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/collaboration/training/training-activity-snapshot")>();
  return {
    ...actual,
    loadTrainingActivitySnapshot: mocks.loadTrainingActivitySnapshot,
  };
});

vi.mock("@/lib/collaboration/training/load-training-series-activity-snapshots", () => ({
  loadTrainingSeriesActivitySnapshots: mocks.loadTrainingSeriesActivitySnapshots,
}));

vi.mock("@/lib/collaboration/contextual-communication-authorization", () => ({
  resolveContextualCommunicationSendAuthorization: mocks.resolveContextualCommunicationSendAuthorization,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: mocks.resolveCommunicationRecipients,
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: mocks.createTeamCommunicationDraft,
  publishTeamCommunication: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: {
      findMany: mocks.platformCommunicationFindMany,
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prepareMultiTrainingActivityChangeCommunicationDraft } from "@/lib/collaboration/contextual-communication-service";

function trainingChangeSet(sessionId: string, oldStart: string, newStart: string): ActivityChangeSet {
  const entries = [
    {
      field: "START_TIME" as const,
      oldValue: oldStart,
      newValue: newStart,
      displayOld: oldStart,
      displayNew: newStart,
      significant: true as const,
    },
  ];
  return {
    domain: "TRAINING",
    activityId: sessionId,
    entries,
    fingerprint: buildActivityChangeFingerprint({
      domain: "TRAINING",
      activityId: sessionId,
      entries,
    }),
  };
}

function snapshot(
  sessionId: string,
  dateKey: string,
  startTime: string,
  scheduleLine: string,
): TrainingActivitySnapshot {
  return {
    sessionId,
    tenantId: "tenant-1",
    teamId: "team-s40",
    teamName: "FC Allschwil Senioren 40+",
    teamSeasonId: "ts-1",
    title: "Senioren 40+",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey,
    startTime,
    endTime: "20:15",
    playableVenueLabel: null,
    dressingRoomLabel: null,
    scheduleLine,
  };
}

function buildMultiChangeSet(count: number): MultiActivityChangeSet {
  const changeSets = Array.from({ length: count }, (_, index) =>
    trainingChangeSet(`session-${index}`, "19:00", "18:45"),
  );

  return {
    domain: "TRAINING",
    batchOperationId: "batch-1",
    teamId: "team-s40",
    batchFingerprint: buildMultiActivityBatchFingerprint(changeSets),
    changeSets,
  };
}

describe("SCE-COLLAB-01D-R2 semantic summarization", () => {
  it("A — 42 identical weekday time changes → UNIFORM_RECURRING_CHANGE", () => {
    const activities = Array.from({ length: 42 }, (_, index) => {
      const base = new Date("2026-10-14T12:00:00");
      base.setDate(base.getDate() + index * 7);
      const dateKey = base.toISOString().slice(0, 10);
      return {
        activityId: `s-${index}`,
        dateKey,
        scheduleLine: `Mittwoch, 14. Oktober 2026 · 18:45–20:15`,
        startTime: "18:45",
        endTime: "20:15",
        entries: trainingChangeSet(`s-${index}`, "19:00", "18:45").entries,
      };
    });

    const summary = buildMultiTrainingCommunicationSummary({
      teamName: "FC Allschwil Senioren 40+",
      trainingTitle: "Senioren 40+",
      timezone: "Europe/Zurich",
      locale: "de-CH",
      activities,
    });

    expect(summary.classification).toBe("UNIFORM_RECURRING_CHANGE");
    expect(summary.effectiveDateKey).toBe("2026-10-14");
    expect(summary.subject).toContain("Trainingszeit geändert");
    expect(summary.bodyText).not.toContain("Mehrere Trainings wurden geändert (42)");
    expect(summary.bodyText.match(/Mittwoch/g)?.length ?? 0).toBeLessThanOrEqual(2);
    expect(summary.bodyText).toContain("Neu: 18:45–20:15 Uhr");
    expect(summary.bodyText).toContain("Bisher: 19:00–20:15 Uhr");
    expect(summary.bodyText.split("\n").length).toBeLessThan(MULTI_ACTIVITY_COMMUNICATION_BODY_MAX_LINES);
  });

  it("F — venue-only uniform change", () => {
    const summary = buildMultiTrainingCommunicationSummary({
      teamName: "Team A",
      trainingTitle: "Training",
      timezone: "Europe/Zurich",
      locale: "de-CH",
      activities: [
        {
          activityId: "s1",
          dateKey: "2026-10-14",
          scheduleLine: "Mittwoch, 14. Oktober 2026 · 19:00–20:15",
          startTime: "19:00",
          endTime: "20:15",
          entries: [
            {
              field: "VENUE",
              oldValue: "Halle A",
              newValue: "Halle B",
              displayOld: "Halle A",
              displayNew: "Halle B",
              significant: true,
            },
          ],
        },
        {
          activityId: "s2",
          dateKey: "2026-10-21",
          scheduleLine: "Mittwoch, 21. Oktober 2026 · 19:00–20:15",
          startTime: "19:00",
          endTime: "20:15",
          entries: [
            {
              field: "VENUE",
              oldValue: "Halle A",
              newValue: "Halle B",
              displayOld: "Halle A",
              displayNew: "Halle B",
              significant: true,
            },
          ],
        },
      ],
    });
    expect(summary.classification).toBe("UNIFORM_RECURRING_CHANGE");
    expect(summary.subject).toContain("Trainingsort geändert");
    expect(summary.bodyText).toContain("Trainingsort");
  });

  it("H — small mixed set stays explicit", () => {
    const summary = buildMultiTrainingCommunicationSummary({
      teamName: "Team A",
      trainingTitle: "Training",
      timezone: "Europe/Zurich",
      locale: "de-CH",
      activities: [
        {
          activityId: "s1",
          dateKey: "2026-10-14",
          scheduleLine: "Mittwoch, 14. Oktober 2026",
          startTime: "18:45",
          endTime: "20:15",
          entries: trainingChangeSet("s1", "19:00", "18:45").entries,
        },
        {
          activityId: "s2",
          dateKey: "2026-10-21",
          scheduleLine: "Mittwoch, 21. Oktober 2026",
          startTime: "19:00",
          endTime: "20:15",
          entries: [
            {
              field: "RESOURCE",
              oldValue: "KR2",
              newValue: "KR3",
              displayOld: "KR2",
              displayNew: "KR3",
              significant: true,
            },
          ],
        },
      ],
    });
    expect(summary.classification).toBe("SMALL_EXPLICIT_SET");
    expect(summary.bodyText).toContain("Mehrere Trainings wurden geändert (2)");
  });

  it("M — deterministic output", () => {
    const input = {
      teamName: "FC Allschwil Senioren 40+",
      trainingTitle: "Senioren 40+",
      timezone: "Europe/Zurich",
      locale: "de-CH",
      activities: [
        {
          activityId: "s2",
          dateKey: "2026-10-21",
          scheduleLine: "Mittwoch, 21. Oktober 2026 · 18:45–20:15",
          startTime: "18:45",
          endTime: "20:15",
          entries: trainingChangeSet("s2", "19:00", "18:45").entries,
        },
        {
          activityId: "s1",
          dateKey: "2026-10-14",
          scheduleLine: "Mittwoch, 14. Oktober 2026 · 18:45–20:15",
          startTime: "18:45",
          endTime: "20:15",
          entries: trainingChangeSet("s1", "19:00", "18:45").entries,
        },
      ],
    };
    const a = buildMultiTrainingCommunicationSummary(input);
    const b = buildMultiTrainingCommunicationSummary(input);
    expect(a).toEqual(b);
    expect(a.effectiveDateKey).toBe("2026-10-14");
  });
});

describe("SCE-COLLAB-01D-R2 prepareMultiTrainingActivityChangeCommunicationDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMultiActivityDispatchPreviewCallCountForTests();
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.resolveCommunicationRecipients.mockResolvedValue({
      summary: { effectiveCount: 12 },
      effectiveRecipientPersonIds: Array.from({ length: 12 }, (_, i) => `p-${i}`),
    });
    mocks.platformCommunicationFindMany.mockResolvedValue([]);
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "draft-1" });
    mocks.loadTrainingActivitySnapshot.mockResolvedValue(null);
  });

  function mockSnapshotsForChangeSet(multiChangeSet: MultiActivityChangeSet) {
    const map = new Map<string, TrainingActivitySnapshot>();
    multiChangeSet.changeSets.forEach((changeSet, index) => {
      const base = new Date("2026-10-14T12:00:00");
      base.setDate(base.getDate() + index * 7);
      const dateKey = base.toISOString().slice(0, 10);
      map.set(
        changeSet.activityId,
        snapshot(
          changeSet.activityId,
          dateKey,
          "18:45",
          "Mittwoch, 14. Oktober 2026 · 18:45–20:15",
        ),
      );
    });
    mocks.loadTrainingSeriesActivitySnapshots.mockResolvedValue(map);
  }

  it("A/B — batch snapshot load once; one draft; COMM-03 once for 42 activities", async () => {
    const multiChangeSet = buildMultiChangeSet(42);
    mockSnapshotsForChangeSet(multiChangeSet);

    const result = await prepareMultiTrainingActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fc-allschwil",
      senderUserId: "user-1",
      trainingSeriesId: "series-1",
      multiChangeSet,
    });

    expect(mocks.loadTrainingSeriesActivitySnapshots).toHaveBeenCalledTimes(1);
    expect(mocks.loadTrainingActivitySnapshot).not.toHaveBeenCalled();
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledTimes(1);
    expect(mocks.resolveCommunicationRecipients).toHaveBeenCalledTimes(1);
    expect(getMultiActivityDispatchPreviewCallCountForTests()).toBe(1);
    expect(result.reusedExistingDraft).toBe(false);
    expect(result.subject).toContain("Trainingszeit geändert");
    expect(result.bodyText).not.toContain("(42)");
  });

  it("F — repeated prepare reuses existing draft", async () => {
    const multiChangeSet = buildMultiChangeSet(3);
    mockSnapshotsForChangeSet(multiChangeSet);
    mocks.platformCommunicationFindMany.mockResolvedValue([
      {
        id: "draft-existing",
        orchestrationMetaJson: {
          collaborationOrigin: "ACTIVITY_CHANGE",
          activityDomain: "TRAINING",
          activityId: multiChangeSet.changeSets[0]!.activityId,
          changeFingerprint: multiChangeSet.batchFingerprint,
          multiActivityBatch: true,
        },
      },
    ]);

    const result = await prepareMultiTrainingActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fc-allschwil",
      senderUserId: "user-1",
      trainingSeriesId: "series-1",
      multiChangeSet,
    });

    expect(result.draftId).toBe("draft-existing");
    expect(result.reusedExistingDraft).toBe(true);
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
    expect(mocks.resolveCommunicationRecipients).toHaveBeenCalledTimes(1);
  });
});
