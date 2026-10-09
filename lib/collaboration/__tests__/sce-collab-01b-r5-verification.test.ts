/**
 * SCE-COLLAB-01B-R5 — tournament audience union, zero-recipient UX, prepare dispatch contract.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOperationalAudienceForTeamIds, dedupeTenantTeamIds } from "@/lib/collaboration/shared/operational-audience";
import {
  CONTEXTUAL_COMMUNICATION_ERROR_CODES,
  mapContextualCommunicationValidationError,
  TEAM_COMMUNICATION_NO_ELIGIBLE_RECIPIENTS_MESSAGE,
} from "@/lib/collaboration/contextual-communication-http";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";
import { buildTournamentActivityChangeSet } from "@/lib/collaboration/tournament/tournament-activity-change";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { prepareTournamentActivityChangeCommunicationDraft } from "@/lib/collaboration/contextual-communication-service";

const serviceMocks = vi.hoisted(() => ({
  loadTournamentActivitySnapshot: vi.fn(),
  resolveTournamentAudienceContext: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/collaboration/tournament/tournament-activity-snapshot", () => ({
  loadTournamentActivitySnapshot: serviceMocks.loadTournamentActivitySnapshot,
}));

vi.mock("@/lib/collaboration/tournament/resolve-tournament-audience", () => ({
  resolveTournamentAudienceContext: serviceMocks.resolveTournamentAudienceContext,
}));

vi.mock("@/lib/collaboration/contextual-communication-authorization", () => ({
  resolveContextualCommunicationSendAuthorization: serviceMocks.resolveContextualCommunicationSendAuthorization,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: serviceMocks.resolveCommunicationRecipients,
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: serviceMocks.createTeamCommunicationDraft,
}));

function tourSnap(overrides: Partial<TournamentActivitySnapshot> = {}): TournamentActivitySnapshot {
  return {
    tournamentId: "tour-playmore",
    tenantId: "tenant-1",
    teamId: "team-f3",
    teamName: "Junioren F3",
    teamSeasonId: "ts-1",
    title: "PlayMore Turnier",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-20",
    startTime: "10:15",
    endTime: "12:00",
    locationLabel: "Im Brüel",
    resourceLabel: "Hauptfeld",
    playableVenueLabel: "Im Brüel",
    scheduleLine: "Montag · 10:15–12:00",
    ...overrides,
  };
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-COLLAB-01B-R5 tournament audience resolution", () => {
  it("R5-02 multi-team audience spec is one UNION component with all team ids", () => {
    const spec = buildOperationalAudienceForTeamIds(["team-f2", "team-f3"]);
    expect(spec.composition).toBe("UNION");
    expect(spec.components[0]?.structural?.teamIds).toEqual(["team-f2", "team-f3"]);
  });

  it("R5-05 dedupeTenantTeamIds sorts and dedupes canonical ids", () => {
    expect(dedupeTenantTeamIds(["team-f3", "team-f2", "team-f3", null])).toEqual([
      "team-f2",
      "team-f3",
    ]);
  });
});

describe("SCE-COLLAB-01B-R5 prepare dispatch contract", () => {
  const cumulativeChangeSet = buildTournamentActivityChangeSet(
    tourSnap({ startTime: "10:00", resourceLabel: "Kunstrasen 2" }),
    tourSnap({ startTime: "10:15", resourceLabel: "Hauptfeld" }),
  )!;

  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.loadTournamentActivitySnapshot.mockResolvedValue(tourSnap());
    serviceMocks.resolveTournamentAudienceContext.mockResolvedValue({
      primaryTeamId: "team-f3",
      teamIds: ["team-f2", "team-f3"],
      teamName: "Junioren F3",
      teamNamesLabel: "Junioren F2, Junioren F3",
    });
    serviceMocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    serviceMocks.createTeamCommunicationDraft.mockResolvedValue({ id: "draft-r5" });
  });

  it("R5-07/R5-08/R5-09 prepare succeeds with canDispatch=false when preview count is zero", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 0 } });
    const result = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(result.draftId).toBe("draft-r5");
    expect(result.recipientCount).toBe(0);
    expect(result.canDispatch).toBe(false);
    expect(result.audienceLabel).toBe("Junioren F2, Junioren F3");
  });

  it("R5-12 positive recipients → canDispatch true", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 4 } });
    const result = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(result.canDispatch).toBe(true);
    expect(result.recipientCount).toBe(4);
  });

  it("R5-19/R5-20 cumulative TIME+RESOURCE preserved in prepare body", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 0 } });
    const result = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(result.bodyText).toContain("10:00");
    expect(result.bodyText).toContain("10:15");
    expect(result.bodyText).toContain("Kunstrasen 2");
    expect(result.bodyText).toContain("Hauptfeld");
  });

  it("R5-03 preview uses single multi-team audience (union), not per-team intersection", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 3 } });
    await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(serviceMocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceSpec: expect.objectContaining({
          components: [
            expect.objectContaining({
              structural: { teamIds: ["team-f2", "team-f3"] },
            }),
          ],
        }),
      }),
    );
    expect(serviceMocks.resolveCommunicationRecipients).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "PREVIEW" }),
    );
  });
});

describe("SCE-COLLAB-01B-R5 localized publish errors", () => {
  it("R5-11 maps zero-recipient dispatch guard to German + errorCode", () => {
    const mapped = mapContextualCommunicationValidationError(
      new TeamCommunicationValidationError(TEAM_COMMUNICATION_NO_ELIGIBLE_RECIPIENTS_MESSAGE),
    );
    expect(mapped.body.errorCode).toBe(CONTEXTUAL_COMMUNICATION_ERROR_CODES.NO_ELIGIBLE_RECIPIENTS);
    expect(mapped.body.error).toContain("berechtigten Empfänger");
    expect(mapped.body.error).not.toContain("no eligible recipients");
  });
});

describe("SCE-COLLAB-01B-R5 UI contracts", () => {
  it("R5-09/R5-10 composer disables send and shows German zero-recipient panel", () => {
    const composer = read("components/admin/collaboration/ContextualActivityCommunicationComposer.tsx");
    expect(composer).toContain("canDispatch");
    expect(composer).toContain("noRecipientsTitle");
    expect(composer).toContain("contextual-activity-communication-no-recipients");
    expect(composer).toContain("CONTEXTUAL_COMMUNICATION_ERROR_CODES.NO_ELIGIBLE_RECIPIENTS");
    expect(composer).toContain('throw new Error(t("noRecipientsBody"))');
  });

  it("R5-26 banner shows team labels and recipient count without leaking identities", () => {
    const surface = read("components/admin/collaboration/ContextualActivityChangeImpactSurface.tsx");
    expect(surface).toContain("teamNamesLabel");
    expect(surface).toContain("contextual-activity-change-recipient-count");
    expect(surface).not.toContain("userId");
    expect(surface).not.toContain("email");
  });
});
