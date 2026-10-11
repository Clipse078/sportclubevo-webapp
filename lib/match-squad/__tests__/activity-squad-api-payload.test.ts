import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildActivitySquadApiPayload,
  resolveActivitySquadApiExtensions,
} from "@/lib/match-squad/activity-squad-api-payload";
import { mergeActivitySquadClientPayload } from "@/lib/match-squad/activity-squad-client-payload";
import type { MatchSquadViewModel } from "@/lib/match-squad/types";

const mocks = vi.hoisted(() => ({
  resolvePlayerReleaseAccess: vi.fn(),
}));

vi.mock("@/lib/match-squad/player-release-auth", () => ({
  resolvePlayerReleaseAccess: mocks.resolvePlayerReleaseAccess,
}));

function baseSquad(overrides: Partial<MatchSquadViewModel> = {}): MatchSquadViewModel {
  return {
    eventId: "event-1",
    teamId: "team-1",
    teamSeasonId: "ts-1",
    teamDisplayName: "Junioren B1",
    version: "v1",
    editable: true,
    readOnlyReason: null,
    selected: [],
    remaining: [],
    selectedPersonIds: [],
    remainingPersonIds: [],
    counts: {
      rosterTotal: 0,
      available: 0,
      unavailable: 0,
      maybe: 0,
      open: 0,
      selected: 0,
      selectedAvailable: 0,
      selectedMaybe: 0,
      selectedOpen: 0,
      conflicts: 0,
    },
    ...overrides,
  };
}

describe("activity-squad-api-payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePlayerReleaseAccess.mockResolvedValue({ canManageSource: true });
  });

  it("resolves release manage capability from source release access and editability", async () => {
    const extensions = await resolveActivitySquadApiExtensions({
      squad: baseSquad(),
      userId: "user-1",
      tenant: { id: "tenant-1", key: "fc-allschwil" },
      accessCanEdit: true,
    });

    expect(extensions.canManageRelease).toBe(true);
    expect(extensions.canEdit).toBe(true);
    expect(extensions.canManageAvailability).toBe(true);
    expect(extensions.releaseReadOnly).toBe(false);
  });

  it("buildActivitySquadApiPayload attaches canonical extensions to squad view model", async () => {
    const payload = await buildActivitySquadApiPayload({
      squad: baseSquad(),
      userId: "user-1",
      tenant: { id: "tenant-1", key: "fc-allschwil" },
      accessCanEdit: true,
    });

    expect(payload.canManageRelease).toBe(true);
    expect(payload.teamSeasonId).toBe("ts-1");
  });

  it("mergeActivitySquadClientPayload preserves release fields when mutation response omits them", () => {
    const previous = {
      ...baseSquad(),
      canEdit: true,
      canManageAvailability: true,
      canManageRelease: true,
      releaseReadOnly: false,
      availabilityCollection: {
        participationResponseDueAt: null,
        participationReminder1At: null,
        participationReminder2At: null,
        participationReminder1PresetKey: null,
        participationReminder2PresetKey: null,
        requestActive: false,
        readOnlyReason: null,
        canConfigureRequest: true,
        canSendReminder: false,
        reminderCandidateId: "match-1",
        outstandingPlayerCount: 0,
        reminderDeliveryTargetCount: null,
      },
    };

    const next = {
      ...baseSquad({ version: "v2" }),
      canEdit: true,
    } as typeof previous;

    const merged = mergeActivitySquadClientPayload(previous, next);
    expect(merged.canManageRelease).toBe(true);
    expect(merged.availabilityCollection).toEqual(previous.availabilityCollection);
    expect(merged.version).toBe("v2");
  });
});
