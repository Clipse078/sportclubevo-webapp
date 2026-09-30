import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureClubEventParticipationResponses } from "@/lib/planning/load-club-event-planning-participants";

const mocks = vi.hoisted(() => ({
  participationResponse: { findMany: vi.fn(), createMany: vi.fn() },
  resolveClubEventInviteePersonIds: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    participationResponse: mocks.participationResponse,
  },
}));

vi.mock("@/lib/events/club-event-participation-audience-service", () => ({
  resolveClubEventInviteePersonIds: (...args: unknown[]) =>
    mocks.resolveClubEventInviteePersonIds(...args),
}));

describe("ensureClubEventParticipationResponses — live population reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.participationResponse.createMany.mockResolvedValue({ count: 0 });
  });

  it("creates OPEN rows for newly resolved structural invitees after publish", async () => {
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p2", "p3", "p4"]);
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1" },
      { personId: "p2" },
      { personId: "p3" },
    ]);

    await ensureClubEventParticipationResponses("tenant-a", "evt-1");

    expect(mocks.participationResponse.createMany).toHaveBeenCalledWith({
      data: [
        {
          tenantId: "tenant-a",
          personId: "p4",
          eventKind: "CLUB_EVENT",
          eventId: "evt-1",
          teamSeasonId: null,
          status: "OPEN",
        },
      ],
      skipDuplicates: true,
    });
  });

  it("does not create rows for persons no longer in live invitee population", async () => {
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p3"]);
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1" },
      { personId: "p2" },
      { personId: "p3" },
    ]);

    await ensureClubEventParticipationResponses("tenant-a", "evt-1");

    expect(mocks.participationResponse.createMany).not.toHaveBeenCalled();
  });
});
