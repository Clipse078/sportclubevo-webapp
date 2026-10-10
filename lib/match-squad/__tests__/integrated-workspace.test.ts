import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  resolveIntegratedMatchSquadWorkspace,
  shouldRenderMatchTeilnehmerDetailedPlayerRoster,
} from "../integrated-workspace";

vi.mock("@/lib/match-squad/event-context", () => ({
  resolveMatchSquadEventContext: vi.fn(),
}));

vi.mock("@/lib/match-squad/auth", () => ({
  resolveMatchSquadAccess: vi.fn(),
}));

import { resolveMatchSquadEventContext } from "@/lib/match-squad/event-context";
import { resolveMatchSquadAccess } from "@/lib/match-squad/auth";
import { MatchSquadValidationError } from "@/lib/match-squad/errors";

describe("shouldRenderMatchTeilnehmerDetailedPlayerRoster", () => {
  it("suppresses detailed roster for MATCH when integrated workspace is available", () => {
    expect(
      shouldRenderMatchTeilnehmerDetailedPlayerRoster({
        eventKind: "MATCH",
        integratedMatchSquadWorkspaceAvailable: true,
      }),
    ).toBe(false);
  });

  it("keeps detailed roster for MATCH when integrated workspace is unavailable", () => {
    expect(
      shouldRenderMatchTeilnehmerDetailedPlayerRoster({
        eventKind: "MATCH",
        integratedMatchSquadWorkspaceAvailable: false,
      }),
    ).toBe(true);
  });

  it("keeps detailed roster for non-MATCH activities regardless of squad workspace", () => {
    for (const eventKind of ["TRAINING", "TOURNAMENT", "CLUB_EVENT"] as const) {
      expect(
        shouldRenderMatchTeilnehmerDetailedPlayerRoster({
          eventKind,
          integratedMatchSquadWorkspaceAvailable: true,
        }),
      ).toBe(true);
    }
  });
});

describe("resolveIntegratedMatchSquadWorkspace", () => {
  beforeEach(() => {
    vi.mocked(resolveMatchSquadEventContext).mockReset();
    vi.mocked(resolveMatchSquadAccess).mockReset();
  });

  it("returns available when context and view access resolve", async () => {
    vi.mocked(resolveMatchSquadEventContext).mockResolvedValue({
      eventId: "ev-1",
      tenantId: "tenant-1",
      teamId: "team-1",
      teamSeasonId: "ts-1",
      seasonId: "season-1",
      status: "SCHEDULED",
      title: "Test",
      teamSeasonStatus: "ACTIVE",
      teamDisplayName: "Team",
    });
    vi.mocked(resolveMatchSquadAccess).mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tenantKey: "fc",
      teamId: "team-1",
      teamSeasonId: "ts-1",
      canView: true,
      canEdit: true,
    });

    await expect(
      resolveIntegratedMatchSquadWorkspace({
        tenantId: "tenant-1",
        tenantKey: "fc",
        userId: "user-1",
        matchEventId: "ev-1",
      }),
    ).resolves.toEqual({
      available: true,
      teamId: "team-1",
      teamSeasonId: "ts-1",
    });
  });

  it("returns unavailable when event context cannot be resolved", async () => {
    vi.mocked(resolveMatchSquadEventContext).mockRejectedValue(
      new MatchSquadValidationError("no team", "NO_OWN_TEAM"),
    );

    await expect(
      resolveIntegratedMatchSquadWorkspace({
        tenantId: "tenant-1",
        tenantKey: "fc",
        userId: "user-1",
        matchEventId: "ev-1",
      }),
    ).resolves.toEqual({ available: false });
  });

  it("returns unavailable when user lacks view access", async () => {
    vi.mocked(resolveMatchSquadEventContext).mockResolvedValue({
      eventId: "ev-1",
      tenantId: "tenant-1",
      teamId: "team-1",
      teamSeasonId: "ts-1",
      seasonId: "season-1",
      status: "SCHEDULED",
      title: "Test",
      teamSeasonStatus: "ACTIVE",
      teamDisplayName: null,
    });
    vi.mocked(resolveMatchSquadAccess).mockResolvedValue(null);

    await expect(
      resolveIntegratedMatchSquadWorkspace({
        tenantId: "tenant-1",
        tenantKey: "fc",
        userId: "user-1",
        matchEventId: "ev-1",
      }),
    ).resolves.toEqual({ available: false });
  });
});
