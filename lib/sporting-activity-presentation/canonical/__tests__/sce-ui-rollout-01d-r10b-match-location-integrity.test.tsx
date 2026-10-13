/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import {
  buildMatchActivityPresentation,
  buildTrainingActivityPresentation,
  buildTournamentActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import {
  buildMatchSportingActivityLocation,
  isUnlabeledInternalResourceKey,
  resolveCanonicalMatchFacilityResourceLabel,
} from "@/lib/sporting-activity-presentation/match-location";
import { formatSportingActivityLocationLines } from "@/lib/sporting-activity-presentation/location";
import {
  formatSceActivityLocationHierarchy,
  resolveSceMatchPresentation,
} from "@/lib/sporting-activity-presentation/canonical";
import { resolveSceTrainingPresentationFromLegacy } from "@/lib/sporting-activity-presentation/canonical";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";
import { isSceActivityDimensionVisible } from "@/lib/sporting-activity-presentation/canonical/match-card-policy";
import { cleanup, render, screen } from "@testing-library/react";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";

function side(partial: Partial<MatchcenterSide> & Pick<MatchcenterSide, "displayName">): MatchcenterSide {
  return {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: null,
    canonicalTeamName: null,
    resolution: "RESOLVED",
    isOwnTeam: false,
    externalLogoUrl: null,
    ...partial,
  };
}

function createAwaySissachMatch(
  overrides: Partial<MatchcenterMatchSummary> = {},
): MatchcenterMatchSummary {
  return {
    id: "match-sissach-away",
    tenantId: "tenant-fca",
    teamId: "team-ff14",
    teamSeasonId: "ts-1",
    seasonId: "season-2026-2027",
    type: "MATCH",
    title: "SV Sissach – Juniorinnen FF-14",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-10-13T14:00:00.000Z"),
    kickoffKnown: true,
    endAt: new Date("2026-10-13T16:00:00.000Z"),
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-10-13T16:00:00.000Z"),
    location: "Sportzentrum Tannenbrunn, Sissach",
    competitionLabel: "Meisterschaft",
    homeAway: "AWAY",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: side({ displayName: "SV Sissach" }),
    away: side({ displayName: "Juniorinnen FF-14", isOwnTeam: true }),
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "1",
      provider: "SFV",
      externalMatchId: 99,
      externalSeasonId: 2027,
      matchNumber: 12,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    operational: {
      pitchCode: "KUNSTRASEN_2",
      homeDressingRoomCode: null,
      awayDressingRoomCode: null,
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: false,
      wochenplanVisible: true,
      trainingsplanVisible: false,
      teamPageVisible: true,
    },
    reviewStage: "APPROVED",
    publishedAt: null,
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
    ...overrides,
  };
}

describe("SCE-UI-ROLLOUT-01D-R10B — canonical Match location integrity", () => {
  it("A — HOME match uses tenant club, venue, and registry resource label", () => {
    const location = buildMatchSportingActivityLocation({
      homeAway: "HOME",
      tenantClubName: "FC Allschwil",
      homeSideDisplayName: "FC Allschwil",
      venueName: "Im Brüel",
      operationalPitchCode: "KUNSTRASEN_2",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Im Brüel · Kunstrasen 2",
    );
  });

  it("B — AWAY match with tenant operational pitch does not leak tenant resource", () => {
    const model = resolveSceMatchPresentation({
      match: createAwaySissachMatch(),
      tenantClubName: "FC Allschwil",
    });
    const line = formatSceActivityLocationHierarchy(model.location, { includeHostClub: false });
    expect(line).toBe("SV Sissach · Sportzentrum Tannenbrunn, Sissach");
    expect(line).not.toMatch(/KUNSTRASEN/i);
    expect(line).not.toMatch(/Kunstrasen 2/);
  });

  it("C — AWAY match may include authoritative external pitch label", () => {
    const location = buildMatchSportingActivityLocation({
      homeAway: "AWAY",
      homeSideDisplayName: "SV Sissach",
      venueName: "Sportzentrum Tannenbrunn, Sissach",
      operationalPitchCode: "KUNSTRASEN_2",
      externalPitchLabel: "Kunstrasen 2",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "SV Sissach · Sportzentrum Tannenbrunn, Sissach · Kunstrasen 2",
    );
  });

  it("D — raw internal resource keys never reach rendered location", () => {
    expect(isUnlabeledInternalResourceKey("KUNSTRASEN_2")).toBe(true);
    expect(resolveCanonicalMatchFacilityResourceLabel("KUNSTRASEN_2", null)).toBe("Kunstrasen 2");
    expect(resolveCanonicalMatchFacilityResourceLabel("KUNSTRASEN_2", "KUNSTRASEN_2")).toBe(
      "Kunstrasen 2",
    );
    expect(resolveCanonicalMatchFacilityResourceLabel("UNKNOWN_PITCH_X", null)).toBeUndefined();
  });

  it("E — no resource yields clean club/venue hierarchy", () => {
    const location = buildMatchSportingActivityLocation({
      homeAway: "AWAY",
      homeSideDisplayName: "SV Sissach",
      venueName: "Sportzentrum Tannenbrunn, Sissach",
    });
    expect(formatSceActivityLocationHierarchy(location)).toBe(
      "SV Sissach · Sportzentrum Tannenbrunn, Sissach",
    );
    expect(formatSceActivityLocationHierarchy(location)).not.toContain(" ·  · ");
  });

  it("F — duplicate venue/resource levels are normalized", () => {
    const location = buildMatchSportingActivityLocation({
      homeAway: "HOME",
      tenantClubName: "FC Allschwil",
      homeSideDisplayName: "FC Allschwil",
      venueName: "Im Brüel, Kunstrasen 2",
      operationalPitchCode: "KUNSTRASEN_2",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Im Brüel, Kunstrasen 2",
    );
  });

  it("G — completed result match uses same location rules", () => {
    const model = resolveSceMatchPresentation({
      match: createAwaySissachMatch({
        status: "COMPLETED",
        resultLabel: "1:3",
        scoreHome: 1,
        scoreAway: 3,
      }),
      tenantClubName: "FC Allschwil",
    });
    expect(model.result?.displayLabel).toBeTruthy();
    expect(formatSceActivityLocationHierarchy(model.location, { includeHostClub: false })).toBe(
      "SV Sissach · Sportzentrum Tannenbrunn, Sissach",
    );
  });

  it("H — all match densities share the same canonical location meaning", () => {
    const model = resolveSceMatchPresentation({
      match: createAwaySissachMatch(),
      tenantClubName: "FC Allschwil",
    });
    const expected = "SV Sissach · Sportzentrum Tannenbrunn, Sissach";
    const densities: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];
    for (const density of densities) {
      if (!isSceActivityDimensionVisible(density, "location")) continue;
      cleanup();
      render(
        <SceMatchCard
          model={model}
          density={density}
          fmtCfg={{ locale: "de-CH", timezone: "Europe/Zurich" }}
        />,
      );
      const el = screen.getByTestId("sce-match-location");
      expect(el.textContent).toBe(expected);
    }
  });

  it("I/J/K — fixture grammar, crests, and SPIEL pill unchanged", () => {
    const model = resolveSceMatchPresentation({
      match: createAwaySissachMatch({
        away: side({
          displayName: "Juniorinnen FF-14",
          isOwnTeam: true,
        }),
        home: side({
          displayName: "SV Sissach",
          externalLogoUrl: "https://cdn.example/sissach.png",
        }),
      }),
      tenantLogoUrl: "https://cdn.example/fca.png",
      tenantClubName: "FC Allschwil",
    });
    render(
      <SceMatchCard
        model={model}
        density="STANDARD"
        fmtCfg={{ locale: "de-CH", timezone: "Europe/Zurich" }}
      />,
    );
    expect(screen.getByText("SPIEL")).toBeTruthy();
    const fixture = document.querySelector('[data-sce-match-region="fixture"]');
    expect(fixture?.textContent).toMatch(/SV Sissach/i);
    expect(fixture?.textContent).toMatch(/Juniorinnen FF-14/i);
    expect(fixture?.textContent).toMatch(/vs/i);
  });

  it("L — training and tournament location behavior unchanged", () => {
    const training = resolveSceTrainingPresentationFromLegacy(
      buildTrainingActivityPresentation({
        resourceKey: "training-session:1",
        title: "Training",
        typeLabel: "Training",
        clubName: "FC Allschwil",
        facilityName: "Im Brüel",
        pitchResourceName: "KR2",
        startAt: new Date("2026-10-10T15:00:00.000Z"),
      }),
    );
    expect(formatSceActivityLocationHierarchy(training.location)).toContain("KR2");

    const tournament = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "Turnier",
      typeLabel: "Turnier",
      organiserName: "FC Lausen 72",
      location: "Sportanlage Bifang",
      pitchCode: "KUNSTRASEN_2",
      pitchLabel: "Kunstrasen 2",
      startAt: new Date("2026-10-10T08:00:00.000Z"),
    });
    expect(formatSportingActivityLocationLines(tournament.location)).toEqual([
      "FC Lausen 72",
      "Sportanlage Bifang",
      "Kunstrasen 2",
    ]);
  });

  it("buildMatchActivityPresentation — away ignores tenant pitchCode allocation", () => {
    const presentation = buildMatchActivityPresentation({
      resourceKey: "event:m-away",
      title: "Away",
      typeLabel: "Spiel",
      teamName: "Juniorinnen FF-14",
      opponentName: "SV Sissach",
      homeAway: "AWAY",
      location: "Sportzentrum Tannenbrunn, Sissach",
      pitchCode: "KUNSTRASEN_2",
      pitchLabel: "Kunstrasen 2",
      startAt: new Date("2026-10-13T14:00:00.000Z"),
      tenantClubName: "FC Allschwil",
    });
    expect(formatSportingActivityLocationLines(presentation.location)).toEqual([
      "SV Sissach",
      "Sportzentrum Tannenbrunn, Sissach",
    ]);
  });
});
