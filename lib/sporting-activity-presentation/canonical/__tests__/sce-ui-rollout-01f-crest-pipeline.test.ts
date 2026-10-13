import { describe, expect, it } from "vitest";
import { resolveSceTournamentPresentation } from "../adapters/tournament";
import { resolveSceTournamentPresentationFromWeekplannerTournament } from "../adapters/weekplanner-tournament";
import { buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design/tournament-organiser-identity";
import {
  SCE_CANONICAL_EXTERNAL_ORGANISER_CREST_URL,
  SCE_CANONICAL_TENANT_ORGANISER_CREST_URL,
} from "../__fixtures__/sce-tournament-organiser-crest-fixtures";
import { createSceWeekplannerTournamentTenantPreviewItem } from "../__fixtures__/sce-weekplanner-tournament-preview-fixtures";
import { createSceTournamentTenantOrganiserFixture } from "@/components/sporting-activity/__fixtures__/sce-tournament-card-fixtures";
import type { TournamentDto } from "@/lib/tournaments/types";
import type { WeekplannerTournamentItem } from "@/lib/weekplanner/types";

const ORGANISER = {
  organizerName: "FC Allschwil",
  organizerLogoUrl: SCE_CANONICAL_TENANT_ORGANISER_CREST_URL,
  organizerExternalClubId: null as string | null,
};

function tournamentDto(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "t-1",
    tenantId: "tenant-1",
    title: "PlayMore Turnier",
    ...ORGANISER,
    location: "Im Brüel",
    homeAway: "HOME",
    status: "SCHEDULED",
    startAt: "2027-06-01T08:15:00.000Z",
    endAt: "2027-06-01T10:00:00.000Z",
    competitionLabel: "Turnier",
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      teamPageVisible: false,
    },
    participants: [],
    team: null,
    resourceAllocations: [],
    ...overrides,
  } as TournamentDto;
}

function weekplannerItem(
  overrides: Partial<WeekplannerTournamentItem> = {},
): WeekplannerTournamentItem {
  return {
    id: "tournament:ev-1",
    tenantId: "t1",
    type: "TOURNAMENT",
    startAt: new Date("2027-06-01T08:15:00.000Z"),
    endAt: new Date("2027-06-01T10:00:00.000Z"),
    canonicalStartAt: new Date("2027-06-01T08:15:00.000Z"),
    canonicalEndAt: new Date("2027-06-01T10:00:00.000Z"),
    timeOverridden: false,
    title: "PlayMore Turnier",
    teamNames: ["Junioren F3"],
    ...ORGANISER,
    pitchAllocations: [
      {
        facilityResourceId: "r1",
        facilityId: "f1",
        code: "KR2",
        name: "Kunstrasen 2",
        facilityName: "Im Brüel",
        occupancyBeforeMinutes: 0,
        occupancyAfterMinutes: 0,
      },
    ],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-1",
    homeAway: "HOME",
    teamSeasonIds: ["ts-1"],
    participantAllocations: [],
    ...overrides,
  };
}

describe("SCE-UI-ROLLOUT-01F-R2 — canonical tournament organiser crest pipeline", () => {
  it("resolves the same crest URL for equivalent organiser input across adapters", () => {
    const center = resolveSceTournamentPresentation({
      tournament: tournamentDto(),
      tenantClubName: "FC Allschwil",
    });
    const weekplanner = resolveSceTournamentPresentationFromWeekplannerTournament(
      weekplannerItem(),
    );
    const direct = buildTournamentOrganiserClubIdentity(tournamentDto());

    expect(center.organiser.logoUrl).toBe(ORGANISER.organizerLogoUrl);
    expect(weekplanner.organiser.logoUrl).toBe(ORGANISER.organizerLogoUrl);
    expect(direct.logoUrl).toBe(ORGANISER.organizerLogoUrl);
  });

  it("preview weekplanner fixture resolves same tenant crest as tournament-card fixture", () => {
    const cardModel = createSceTournamentTenantOrganiserFixture();
    const wpModel = resolveSceTournamentPresentationFromWeekplannerTournament(
      createSceWeekplannerTournamentTenantPreviewItem(),
    );
    expect(wpModel.organiser.logoUrl).toBe(cardModel.organiser.logoUrl);
    expect(wpModel.organiser.logoUrl).toBe(SCE_CANONICAL_TENANT_ORGANISER_CREST_URL);
  });

  it("external organiser uses domain organizerLogoUrl without tenant crest bypass", () => {
    const externalLogo = SCE_CANONICAL_EXTERNAL_ORGANISER_CREST_URL;
    const dto = tournamentDto({
      organizerName: "FC Arisdorf",
      organizerLogoUrl: externalLogo,
      organizerExternalClubId: "ext-club-1",
      homeAway: "AWAY",
    });
    const model = resolveSceTournamentPresentation({ tournament: dto });
    expect(model.organiser.logoUrl).toBe(externalLogo);
  });

  it("does not fabricate initials when domain crest is present", () => {
    const identity = buildTournamentOrganiserClubIdentity(tournamentDto());
    expect(identity.logoUrl).toBeTruthy();
    expect(identity.fallbackIdentity.kind).toBe("initials");
  });

  it("allows true fallback when domain crest is absent", () => {
    const identity = buildTournamentOrganiserClubIdentity(
      tournamentDto({ organizerLogoUrl: null }),
    );
    expect(identity.logoUrl).toBeNull();
  });

  it("weekplanner adapter does not infer crest from tenantClubName alone", () => {
    const model = resolveSceTournamentPresentationFromWeekplannerTournament(
      weekplannerItem({ organizerLogoUrl: null }),
      { tenantClubName: "FC Allschwil" },
    );
    expect(model.organiser.displayName).toBe("FC Allschwil");
    expect(model.organiser.logoUrl).toBeNull();
  });
});
