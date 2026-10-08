import { describe, expect, it } from "vitest";
import {
  buildTrainingActivityChangeImpact,
  buildTrainingActivityChangeSet,
  diffTrainingActivitySnapshots,
} from "@/lib/collaboration/training/training-activity-change";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { hasCommunicationWorthyChanges } from "@/lib/collaboration/activity-change/policy";
import { buildActivityChangeAnnouncementBody } from "@/lib/collaboration/activity-change/presentation";
import { validateChangeSetAgainstCurrentSnapshot } from "@/lib/collaboration/contextual-communication-service";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

function snapshot(overrides: Partial<TrainingActivitySnapshot> = {}): TrainingActivitySnapshot {
  return {
    sessionId: "sess-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamName: "Junioren F2",
    teamSeasonId: "ts-1",
    title: "Junioren F2 Training",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-15",
    startTime: "15:45",
    endTime: "17:15",
    playableVenueLabel: "Im Brüel · KR2",
    dressingRoomLabel: null,
    scheduleLine: "Mittwoch, 15.10.2026 · 15:45–17:15",
    ...overrides,
  };
}

describe("SCE-COLLAB-01A activity change detection", () => {
  it("unchanged training produces no worthy change set", () => {
    const before = snapshot();
    const after = snapshot();
    expect(hasCommunicationWorthyChanges(diffTrainingActivitySnapshots(before, after))).toBe(false);
    expect(buildTrainingActivityChangeSet(before, after)).toBeNull();
  });

  it("date change is communication-worthy", () => {
    const before = snapshot();
    const after = snapshot({ dateKey: "2026-10-16" });
    const set = buildTrainingActivityChangeSet(before, after);
    expect(set?.entries.some((e) => e.field === "DATE")).toBe(true);
  });

  it("start/end time changes are communication-worthy", () => {
    const before = snapshot();
    const after = snapshot({ startTime: "16:00", endTime: "17:30" });
    const entries = diffTrainingActivitySnapshots(before, after);
    expect(entries.some((e) => e.field === "START_TIME")).toBe(true);
    expect(entries.some((e) => e.field === "END_TIME")).toBe(true);
  });

  it("venue change is communication-worthy", () => {
    const before = snapshot();
    const after = snapshot({ playableVenueLabel: "Gartenschulhaus Halle" });
    const set = buildTrainingActivityChangeSet(before, after);
    expect(set?.entries.some((e) => e.field === "VENUE")).toBe(true);
  });

  it("cancellation is communication-worthy", () => {
    const before = snapshot();
    const after = snapshot({ status: "CANCELLED" });
    const set = buildTrainingActivityChangeSet(before, after);
    expect(set?.entries.some((e) => e.field === "STATUS")).toBe(true);
  });

  it("consolidates multiple changes in one change set", () => {
    const before = snapshot();
    const after = snapshot({
      dateKey: "2026-10-16",
      startTime: "16:00",
      playableVenueLabel: "Gartenschulhaus Halle",
    });
    const set = buildTrainingActivityChangeSet(before, after);
    expect(set?.entries.length).toBeGreaterThanOrEqual(3);
  });

  it("builds announcement body from change context", () => {
    const before = snapshot();
    const after = snapshot({ playableVenueLabel: "Gartenschulhaus Halle" });
    const set = buildTrainingActivityChangeSet(before, after);
    expect(set).not.toBeNull();
    const body = buildActivityChangeAnnouncementBody({
      introLine: "Das Training wurde angepasst.",
      entries: set!.entries,
      scheduleLine: after.scheduleLine,
    });
    expect(body).toContain("Im Brüel · KR2");
    expect(body).toContain("Gartenschulhaus Halle");
  });

  it("impact marks canCommunicate independently from worthy changes", () => {
    const before = snapshot();
    const after = snapshot({ playableVenueLabel: "Gartenschulhaus Halle" });
    const impact = buildTrainingActivityChangeImpact({
      before,
      after,
      canCommunicate: false,
      audience: {
        teamId: "team-1",
        teamName: "Junioren F2",
        recipientPreviewLabel: "Junioren F2",
        effectiveRecipientCount: null,
        zeroRecipients: false,
      },
    });
    expect(impact.worthy).toBe(true);
    expect(impact.canCommunicate).toBe(false);
  });
});

describe("SCE-COLLAB-01A change set validation", () => {
  it("rejects stale venue on prepare", () => {
    const before = snapshot();
    const after = snapshot({ playableVenueLabel: "Gartenschulhaus Halle" });
    const set = buildTrainingActivityChangeSet(before, after);
    expect(set).not.toBeNull();
    expect(() =>
      validateChangeSetAgainstCurrentSnapshot(snapshot({ playableVenueLabel: "Other" }), set!),
    ).toThrow(TeamCommunicationValidationError);
  });
});
