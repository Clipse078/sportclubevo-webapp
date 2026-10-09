/**
 * SCE-COLLAB-01A-R1 — automated verification gate (audience, auth, prepare/publish, isolation).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import {
  buildTrainingActivityChangeSet,
  diffTrainingActivitySnapshots,
} from "@/lib/collaboration/training/training-activity-change";
import { buildActivityChangeFingerprint } from "@/lib/collaboration/activity-change/fingerprint";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
} from "@/lib/communication/team/team-communication-errors";

const mocks = vi.hoisted(() => ({
  loadTrainingActivitySnapshot: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
  resolveTeamCommunicationAuthorization: vi.fn(),
  platformCommunicationFindMany: vi.fn(),
  platformCommunicationFindFirst: vi.fn(),
  platformCommunicationUpdate: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
}));

vi.mock("@/lib/collaboration/training/training-activity-snapshot", () => ({
  loadTrainingActivitySnapshot: mocks.loadTrainingActivitySnapshot,
}));

vi.mock("@/lib/collaboration/contextual-communication-authorization", () => ({
  resolveContextualCommunicationSendAuthorization: mocks.resolveContextualCommunicationSendAuthorization,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: mocks.resolveCommunicationRecipients,
}));

vi.mock("@/lib/communication/team/team-communication-authorization", () => ({
  resolveTeamCommunicationAuthorization: mocks.resolveTeamCommunicationAuthorization,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: {
      findMany: mocks.platformCommunicationFindMany,
      findFirst: mocks.platformCommunicationFindFirst,
      update: mocks.platformCommunicationUpdate,
    },
  },
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: mocks.createTeamCommunicationDraft,
  publishTeamCommunication: mocks.publishTeamCommunication,
}));

import { resolveTrainingCollaborationImpactAfterChange } from "@/lib/collaboration/training/training-collaboration-impact-service";
import { buildTrainingMutationCollaborationImpact } from "@/lib/collaboration/training/training-mutation-collaboration";
import {
  prepareTrainingActivityChangeCommunicationDraft,
  publishPreparedTrainingActivityChangeCommunication,
} from "@/lib/collaboration/contextual-communication-service";
import { defaultTeamOperationalAudience } from "@/lib/communication/platform/seams/team-communication-seam";

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

function venueChangePair(sessionId = "sess-1") {
  const before = snapshot({ sessionId });
  const after = snapshot({ sessionId, playableVenueLabel: "Gartenschulhaus Halle" });
  return {
    before,
    after,
    changeSet: buildTrainingActivityChangeSet(before, after)!,
  };
}

describe("SCE-COLLAB-01A-R1 audience integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.resolveCommunicationRecipients.mockResolvedValue({
      summary: { effectiveCount: 12 },
    });
  });

  it("uses defaultTeamOperationalAudience via canonical resolveCommunicationRecipients PREVIEW", async () => {
    const before = snapshot();
    const after = snapshot({ playableVenueLabel: "Neue Halle" });
    const impact = await resolveTrainingCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before,
      after,
    });

    expect(impact?.worthy).toBe(true);
    expect(mocks.resolveCommunicationRecipients).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        mode: "PREVIEW",
        channel: "IN_APP",
        category: "TEAM_OPERATIONAL",
        audience: defaultTeamOperationalAudience("team-1"),
      }),
    );
    expect(impact?.audience?.effectiveRecipientCount).toBe(12);
  });

  it("PREVIEW mode does not publish or create drafts", async () => {
    const before = snapshot();
    const after = snapshot({ startTime: "16:00" });
    await resolveTrainingCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before,
      after,
    });
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
    expect(mocks.publishTeamCommunication).not.toHaveBeenCalled();
    expect(mocks.resolveCommunicationRecipients.mock.calls[0]?.[0]?.mode).toBe("PREVIEW");
  });

  it("handles zero recipients safely", async () => {
    mocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 0 } });
    const impact = await resolveTrainingCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: snapshot(),
      after: snapshot({ endTime: "18:00" }),
    });
    expect(impact?.audience?.zeroRecipients).toBe(true);
    expect(impact?.audience?.effectiveRecipientCount).toBe(0);
  });

  it("skips recipient resolution when communication send is denied", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    const impact = await resolveTrainingCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: snapshot(),
      after: snapshot({ playableVenueLabel: "X" }),
    });
    expect(mocks.resolveCommunicationRecipients).not.toHaveBeenCalled();
    expect(impact?.canCommunicate).toBe(false);
    expect(impact?.worthy).toBe(true);
  });

  it("isolates recipient preview failure without throwing", async () => {
    mocks.resolveCommunicationRecipients.mockRejectedValue(new Error("resolver down"));
    const impact = await resolveTrainingCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: snapshot(),
      after: snapshot({ playableVenueLabel: "X" }),
    });
    expect(impact?.worthy).toBe(true);
    expect(impact?.audience?.effectiveRecipientCount).toBeNull();
  });
});

describe("SCE-COLLAB-01A-R1 authorization matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { after } = venueChangePair();
    mocks.loadTrainingActivitySnapshot.mockResolvedValue(after);
    mocks.platformCommunicationFindMany.mockResolvedValue([]);
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "draft-new" });
  });

  it("ACTIVITY_YES_COMM_YES — prepare succeeds when team send is granted", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    const { changeSet } = venueChangePair();
    const result = await prepareTrainingActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      sessionId: "sess-1",
      changeSet,
    });
    expect(result.draftId).toBe("draft-new");
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalled();
  });

  it("ACTIVITY_YES_COMM_NO — prepare denied at service layer", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    await expect(
      prepareTrainingActivityChangeCommunicationDraft({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-1",
        sessionId: "sess-1",
        changeSet: venueChangePair().changeSet,
      }),
    ).rejects.toThrow(TeamCommunicationForbiddenError);
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
  });

  it("cross-tenant training session is not found", async () => {
    mocks.loadTrainingActivitySnapshot.mockResolvedValue(null);
    await expect(
      prepareTrainingActivityChangeCommunicationDraft({
        tenantId: "tenant-other",
        tenantKey: "other",
        senderUserId: "user-1",
        sessionId: "sess-1",
        changeSet: venueChangePair().changeSet,
      }),
    ).rejects.toThrow(TeamCommunicationNotFoundError);
  });

  it("publish re-authorizes and rejects cross-tenant draft", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.platformCommunicationFindFirst.mockResolvedValue(null);
    await expect(
      publishPreparedTrainingActivityChangeCommunication({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-1",
        teamId: "team-1",
        draftId: "missing",
      }),
    ).rejects.toThrow(TeamCommunicationNotFoundError);
  });

  it("publish denies when send authorization fails (server enforcement)", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    await expect(
      publishPreparedTrainingActivityChangeCommunication({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-1",
        teamId: "team-1",
        draftId: "draft-1",
      }),
    ).rejects.toThrow(TeamCommunicationForbiddenError);
    expect(mocks.platformCommunicationFindFirst).not.toHaveBeenCalled();
  });

  it("impersonation uses effective actor id passed by API caller", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    await prepareTrainingActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "effective-user-99",
      sessionId: "sess-1",
      changeSet: venueChangePair().changeSet,
    });
    expect(mocks.resolveContextualCommunicationSendAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "effective-user-99" }),
    );
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ senderUserId: "effective-user-99" }),
    );
  });

});

describe("SCE-COLLAB-01A-R1 enumeration security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadTrainingActivitySnapshot.mockResolvedValue(venueChangePair().after);
    mocks.platformCommunicationFindMany.mockResolvedValue([]);
  });

  it("prepare does not return draft payload when send is denied", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    await expect(
      prepareTrainingActivityChangeCommunicationDraft({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-1",
        sessionId: "sess-1",
        changeSet: venueChangePair().changeSet,
      }),
    ).rejects.toThrow(TeamCommunicationForbiddenError);
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
    expect(mocks.resolveCommunicationRecipients).not.toHaveBeenCalled();
  });

  it("recipient preview runs only after canCommunicate in impact assembly", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    mocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 99 } });
    await resolveTrainingCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: snapshot(),
      after: snapshot({ playableVenueLabel: "Leak?" }),
    });
    expect(mocks.resolveCommunicationRecipients).not.toHaveBeenCalled();
  });
});

describe("SCE-COLLAB-01A-R1 prepare/publish semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const pair = venueChangePair();
    mocks.loadTrainingActivitySnapshot.mockResolvedValue(pair.after);
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.platformCommunicationFindMany.mockResolvedValue([]);
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "draft-new" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "pub-1", recipientCount: 3 });
    mocks.platformCommunicationFindFirst.mockResolvedValue({
      id: "draft-1",
      subject: "Änderung: T",
      bodyText: "Body",
      orchestrationMetaJson: {
        collaborationOrigin: "ACTIVITY_CHANGE",
        activityDomain: "TRAINING",
        activityId: "sess-1",
        changeFingerprint: pair.changeSet.fingerprint,
      },
      conversation: { teamId: "team-1" },
    });
  });

  it("prepare creates DRAFT only via createTeamCommunicationDraft", async () => {
    const { changeSet } = venueChangePair();
    const result = await prepareTrainingActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      sessionId: "sess-1",
      changeSet,
    });
    expect(result.reusedExistingDraft).toBe(false);
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        teamId: "team-1",
        kind: "ANNOUNCEMENT",
        audienceSpec: defaultTeamOperationalAudience("team-1"),
      }),
    );
    expect(mocks.publishTeamCommunication).not.toHaveBeenCalled();
  });

  it("publish uses canonical publishTeamCommunication pipeline", async () => {
    const result = await publishPreparedTrainingActivityChangeCommunication({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      teamId: "team-1",
      draftId: "draft-1",
      subject: "Custom",
      bodyText: "Custom body",
    });
    expect(result.recipientCount).toBe(3);
    expect(mocks.publishTeamCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        communicationId: "draft-1",
        preservePreparedAudience: true,
      }),
    );
  });
});

describe("SCE-COLLAB-01A-R1 duplicate semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadTrainingActivitySnapshot.mockResolvedValue(venueChangePair().after);
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "draft-new" });
  });

  it("reuses existing draft for same sender + fingerprint + activityId", async () => {
    const { changeSet } = venueChangePair();
    mocks.platformCommunicationFindMany.mockResolvedValue([
      {
        id: "draft-existing",
        orchestrationMetaJson: {
          collaborationOrigin: "ACTIVITY_CHANGE",
          activityDomain: "TRAINING",
          activityId: "sess-1",
          changeFingerprint: changeSet.fingerprint,
        },
      },
    ]);
    const result = await prepareTrainingActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      sessionId: "sess-1",
      changeSet,
    });
    expect(result.reusedExistingDraft).toBe(true);
    expect(result.draftId).toBe("draft-existing");
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
  });

  it("does not reuse draft when fingerprint differs", async () => {
    const first = venueChangePair().changeSet;
    const secondAfter = snapshot({ playableVenueLabel: "Andere Halle" });
    const second = buildTrainingActivityChangeSet(snapshot(), secondAfter)!;
    mocks.loadTrainingActivitySnapshot.mockResolvedValue(secondAfter);
    expect(first.fingerprint).not.toBe(second.fingerprint);
    mocks.platformCommunicationFindMany.mockResolvedValue([
      {
        id: "draft-old",
        orchestrationMetaJson: {
          collaborationOrigin: "ACTIVITY_CHANGE",
          activityId: "sess-1",
          changeFingerprint: first.fingerprint,
        },
      },
    ]);
    const result = await prepareTrainingActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      sessionId: "sess-1",
      changeSet: second,
    });
    expect(result.reusedExistingDraft).toBe(false);
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalled();
  });

  it("fingerprints differ across activities with similar text", () => {
    const setA = buildTrainingActivityChangeSet(
      snapshot({ sessionId: "sess-a" }),
      snapshot({ sessionId: "sess-a", playableVenueLabel: "Halle" }),
    )!;
    const setB = buildTrainingActivityChangeSet(
      snapshot({ sessionId: "sess-b" }),
      snapshot({ sessionId: "sess-b", playableVenueLabel: "Halle" }),
    )!;
    expect(setA.fingerprint).not.toBe(setB.fingerprint);
  });
});

describe("SCE-COLLAB-01A-R1 failure isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("training mutation collaboration omits impact when assembly throws", async () => {
    mocks.loadTrainingActivitySnapshot
      .mockResolvedValueOnce(snapshot())
      .mockRejectedValue(new Error("after load failed"));
    const result = await buildTrainingMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      sessionId: "sess-1",
      beforeSnapshot: snapshot(),
    });
    expect(result.impact).toBeNull();
  });

  it("prepare failure does not invoke publish", async () => {
    mocks.loadTrainingActivitySnapshot.mockResolvedValue(venueChangePair().after);
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.createTeamCommunicationDraft.mockRejectedValue(new Error("draft failed"));
    await expect(
      prepareTrainingActivityChangeCommunicationDraft({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-1",
        sessionId: "sess-1",
        changeSet: venueChangePair().changeSet,
      }),
    ).rejects.toThrow("draft failed");
    expect(mocks.publishTeamCommunication).not.toHaveBeenCalled();
  });
});

describe("SCE-COLLAB-01A-R1 change detection completeness", () => {
  it("RESTORE and RESOURCE and internal metadata cases", () => {
    const unchanged = diffTrainingActivitySnapshots(snapshot(), snapshot());
    expect(unchanged).toHaveLength(0);

    expect(
      buildTrainingActivityChangeSet(
        snapshot({ status: "CANCELLED" }),
        snapshot({ status: "SCHEDULED" }),
      )?.entries.some((e) => e.field === "STATUS"),
    ).toBe(true);

    expect(
      buildTrainingActivityChangeSet(
        snapshot({ dressingRoomLabel: "Umkleide 1" }),
        snapshot({ dressingRoomLabel: "Umkleide 2" }),
      )?.entries.some((e) => e.field === "RESOURCE"),
    ).toBe(true);

    const internalOnly = diffTrainingActivitySnapshots(
      snapshot({ title: "Old title" }),
      snapshot({ title: "New title" }),
    );
    expect(internalOnly).toHaveLength(0);
  });

  it("fingerprints stable for consolidated multi-change set", () => {
    const before = snapshot();
    const after = snapshot({
      dateKey: "2026-10-16",
      startTime: "16:00",
      playableVenueLabel: "X",
    });
    const set = buildTrainingActivityChangeSet(before, after)!;
    const expected = buildActivityChangeFingerprint({
      domain: "TRAINING",
      activityId: "sess-1",
      entries: set.entries,
    });
    expect(set.fingerprint).toBe(expected);
    expect(set.entries.length).toBeGreaterThanOrEqual(3);
  });
});
