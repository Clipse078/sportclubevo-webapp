import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSceMatchPresentation } from "../adapters/match";
import { resolveSceTournamentPresentation } from "../adapters/tournament";
import { formatSceActivityLocationHierarchy } from "../location-format";
import type { SceActivityPresentationModel } from "../types";

const repoRoot = join(process.cwd());

describe("SCE-UI-ROLLOUT-01C — architecture guardrails", () => {
  it("exports a single canonical presentation model entry point", () => {
    const indexSource = readFileSync(
      join(repoRoot, "lib/sporting-activity-presentation/canonical/index.ts"),
      "utf8",
    );
    expect(indexSource).toContain("resolveSceActivityPresentation");
    expect(indexSource).toContain("SceActivityPresentationModel");
  });

  it("does not introduce a parallel presentation model module outside canonical/", () => {
    const typesSource = readFileSync(
      join(repoRoot, "lib/sporting-activity-presentation/types.ts"),
      "utf8",
    );
    expect(typesSource).not.toContain("SceActivityPresentationModel");
  });

  it("location hierarchy never emits doubled separators", () => {
    const formatted = formatSceActivityLocationHierarchy({
      mode: "HOME",
      hostOrOrganiser: "FC Allschwil",
      venueName: "Im Brüel",
      facilityResource: "KR2",
    });
    expect(formatted).toBe("FC Allschwil · Im Brüel · KR2");
    expect(formatted).not.toMatch(/ ·  · /);
  });

  it("tournament resolver never attaches match fixture fields", () => {
    const model = resolveSceTournamentPresentation({
      tournament: {
        id: "t1",
        tenantId: "tenant",
        title: "Cup",
        description: null,
        status: "SCHEDULED",
        source: "MANUAL",
        startAt: "2026-01-01T10:00:00.000Z",
        endAt: null,
        meetingTime: null,
        location: "Venue",
        organizerName: "Org",
        organizerLogoUrl: null,
        organizerExternalClubId: null,
        competitionLabel: null,
        resultLabel: null,
        remarks: null,
        season: { id: "s", key: "k", name: "n" },
        team: null,
        teamLogoUrl: null,
        homeAway: "HOME",
        participants: [],
        resourceAllocations: [],
      },
    });
    expect(model.kind).toBe("TOURNAMENT");
    expect((model as SceActivityPresentationModel & { fixture?: unknown }).fixture).toBeUndefined();
  });

  it("match adapter enforces homeLeftAwayRightInvariant", () => {
    const model = resolveSceMatchPresentation({
      match: {
        id: "m",
        tenantId: "t",
        teamId: null,
        teamSeasonId: null,
        seasonId: null,
        type: "MATCH",
        title: "H – A",
        description: null,
        status: "SCHEDULED",
        startAt: new Date(),
        kickoffKnown: true,
        endAt: null,
        operationalEndAtOverride: null,
        operationalEndAt: new Date(),
        location: null,
        competitionLabel: null,
        homeAway: "HOME",
        resultLabel: null,
        intermediateResultLabel: null,
        scoreHome: null,
        scoreAway: null,
        home: {
          providerTeamId: null,
          providerTeamName: null,
          canonicalTeamId: null,
          canonicalTeamName: null,
          displayName: "Home FC",
          resolution: "RESOLVED",
          isOwnTeam: false,
          externalLogoUrl: null,
        },
        away: {
          providerTeamId: null,
          providerTeamName: null,
          canonicalTeamId: null,
          canonicalTeamName: null,
          displayName: "Away FC",
          resolution: "RESOLVED",
          isOwnTeam: true,
          externalLogoUrl: null,
        },
        source: {
          eventSource: "MANUAL",
          externalSource: null,
          externalSourceId: null,
          provider: null,
          externalMatchId: null,
          externalSeasonId: null,
          matchNumber: null,
        },
        synchronization: {
          eventLastSyncedAt: null,
          mappingLastSyncedAt: null,
          detailSyncedAt: null,
          providerMatchState: null,
          providerMatchStateName: null,
        },
        operational: {
          pitchCode: null,
          homeDressingRoomCode: null,
          awayDressingRoomCode: null,
          meetingTime: null,
          remarks: null,
        },
        visibility: {
          websiteVisible: false,
          infoboardVisible: false,
          homepageVisible: false,
          wochenplanVisible: false,
          trainingsplanVisible: false,
          teamPageVisible: false,
        },
        reviewStage: "APPROVED",
        publishedAt: null,
        participationResponseDueAt: null,
        participationReminder1At: null,
        participationReminder2At: null,
        participationReminder1PresetKey: null,
        participationReminder2PresetKey: null,
      },
    });
    expect(model.fixture.homeLeftAwayRightInvariant).toBe(true);
    expect(model.fixture.home.displayName).toBe("Home FC");
    expect(model.fixture.away.displayName).toBe("Away FC");
  });
});
