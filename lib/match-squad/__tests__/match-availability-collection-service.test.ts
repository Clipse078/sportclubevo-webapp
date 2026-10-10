import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveMatchSquadEventContext: vi.fn(),
  listParticipationSubjectPersonIds: vi.fn(),
  assertSpielbetriebTeamCommunicationView: vi.fn(),
  expandSubjectsToDeliveryTargets: vi.fn(),
  eventFindFirst: vi.fn(),
  resolveEventParticipationAnchor: vi.fn(),
}));

vi.mock("@/lib/match-squad/event-context", () => ({
  resolveMatchSquadEventContext: mocks.resolveMatchSquadEventContext,
}));

vi.mock("@/lib/participation/participation-audience-resolution", () => ({
  listParticipationSubjectPersonIds: mocks.listParticipationSubjectPersonIds,
}));

vi.mock("@/lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization", () => ({
  assertSpielbetriebTeamCommunicationView: mocks.assertSpielbetriebTeamCommunicationView,
  assertSpielbetriebTeamCommunicationSend: vi.fn(),
}));

vi.mock("@/lib/communication/event/event-participation-anchor", () => ({
  resolveEventParticipationAnchor: mocks.resolveEventParticipationAnchor,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/guardian-expansion", () => ({
  createGuardianExpansionPort: () => ({
    expandSubjectsToDeliveryTargets: mocks.expandSubjectsToDeliveryTargets,
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: mocks.eventFindFirst },
  },
}));

import { loadMatchAvailabilityCollectionMeta } from "@/lib/match-squad/match-availability-collection-service";

describe("match-availability-collection-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveMatchSquadEventContext.mockResolvedValue({
      eventId: "ev1",
      teamId: "team1",
      teamSeasonId: "ts1",
    });
    mocks.eventFindFirst.mockResolvedValue({
      startAt: new Date(Date.now() + 86_400_000),
      status: "SCHEDULED",
      participationResponseDueAt: new Date(Date.now() + 3_600_000),
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: null,
      participationReminder2PresetKey: null,
    });
    mocks.resolveEventParticipationAnchor.mockResolvedValue({ anchor: true });
    mocks.listParticipationSubjectPersonIds.mockResolvedValue(["p1", "p2"]);
    mocks.assertSpielbetriebTeamCommunicationView.mockResolvedValue(undefined);
    mocks.expandSubjectsToDeliveryTargets.mockResolvedValue([
      { deliveryUserIds: ["u1"] },
      { deliveryUserIds: ["u2", "u3"] },
    ]);
  });

  it("returns outstanding counts and delivery target preview", async () => {
    const meta = await loadMatchAvailabilityCollectionMeta({
      tenantId: "t1",
      eventId: "ev1",
      userId: "user1",
    });
    expect(meta.requestActive).toBe(true);
    expect(meta.outstandingPlayerCount).toBe(2);
    expect(meta.reminderDeliveryTargetCount).toBe(3);
    expect(meta.canSendReminder).toBe(true);
  });
});
