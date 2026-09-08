import { describe, expect, it } from "vitest";
import {
  buildAttentionItems,
  buildCommandCenterKpis,
} from "@/lib/dashboard/command-center";
import {
  buildCommandCenterMatchPresentation,
  buildCommandCenterTournamentParticipants,
  resolveNewsHeroImageUrl,
} from "@/lib/dashboard/command-center-presentation";
import { getDashboardQuickActionDefs } from "@/lib/dashboard/quick-actions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { EMPTY_TOURNAMENT_LOGO_RESOLUTION_CONTEXT } from "@/lib/tournaments/logo-resolution-context";

describe("SCE-DASHBOARD-V3-01 — command center builders", () => {
  describe("buildCommandCenterKpis", () => {
    it("returns core operational KPIs without fake trend data", () => {
      const kpis = buildCommandCenterKpis({
        teamCount: 12,
        activePersonCount: 240,
        todayEventCount: 3,
        openRegistrationCount: 5,
        canSeeRegistrations: true,
      });

      expect(kpis).toHaveLength(4);
      expect(kpis.map((kpi) => kpi.label)).toEqual([
        "Teams",
        "Aktive Personen",
        "Termine heute",
        "Offene Anmeldungen",
      ]);
      expect(kpis.every((kpi) => !kpi.context?.includes("%"))).toBe(true);
    });

    it("omits registrations KPI when the actor lacks registration permissions", () => {
      const kpis = buildCommandCenterKpis({
        teamCount: 4,
        activePersonCount: 80,
        todayEventCount: 1,
        openRegistrationCount: 9,
        canSeeRegistrations: false,
      });

      expect(kpis).toHaveLength(3);
      expect(kpis.some((kpi) => kpi.key === "registrations")).toBe(false);
    });
  });

  describe("buildAttentionItems", () => {
    it("never injects filler tasks when nothing needs attention", () => {
      const items = buildAttentionItems({
        newsInReviewCount: 0,
        openRegistrationCount: 0,
        scheduledNewsCount: 0,
        overdueActionCount: 0,
        canSeeNews: true,
        canSeeRegistrations: true,
        canSeeMeetings: true,
      });

      expect(items).toEqual([]);
    });

    it("creates attention items only from real operational counts", () => {
      const items = buildAttentionItems({
        newsInReviewCount: 2,
        openRegistrationCount: 1,
        scheduledNewsCount: 0,
        overdueActionCount: 3,
        canSeeNews: true,
        canSeeRegistrations: true,
        canSeeMeetings: true,
      });

      expect(items.map((item) => item.key)).toEqual([
        "news-review",
        "registrations",
        "overdue-actions",
      ]);
      expect(items.every((item) => item.href.startsWith("/"))).toBe(true);
    });
  });
});

describe("SCE-DASHBOARD-V3-01 — quick actions", () => {
  it("filters actions by permission keys and caps the rail", () => {
    const actions = getDashboardQuickActionDefs(
      [PERMISSIONS.NEWS_MANAGE, PERMISSIONS.WOCHENPLAN_MANAGE],
      4,
    );

    expect(actions.length).toBeLessThanOrEqual(4);
    expect(actions.some((action) => action.key === "news")).toBe(true);
    expect(actions.some((action) => action.key === "planner-week")).toBe(true);
    expect(actions.some((action) => action.key === "people-access")).toBe(false);
  });
});

describe("SCE-DASHBOARD-V3-02B — command center presentation", () => {
  describe("resolveNewsHeroImageUrl", () => {
    it("prefers heroMedia URL over legacy imageUrl", () => {
      expect(
        resolveNewsHeroImageUrl({
          heroMediaUrl: "https://cdn.example/hero.jpg",
          imageUrl: "https://cdn.example/legacy.jpg",
        }),
      ).toBe("https://cdn.example/hero.jpg");
    });

    it("falls back to imageUrl when hero media is absent", () => {
      expect(
        resolveNewsHeroImageUrl({
          heroMediaUrl: null,
          imageUrl: "https://cdn.example/legacy.jpg",
        }),
      ).toBe("https://cdn.example/legacy.jpg");
    });

    it("returns null when no configured news image exists", () => {
      expect(resolveNewsHeroImageUrl({ heroMediaUrl: null, imageUrl: null })).toBeNull();
    });
  });

  describe("buildCommandCenterMatchPresentation", () => {
    it("maps canonical match identity without inventing logos", () => {
      const presentation = buildCommandCenterMatchPresentation({
        policy: {
          id: "evt-1",
          status: "SCHEDULED",
          infoboardVisible: true,
          websiteVisible: true,
          trainingsplanVisible: true,
          homeAway: "HOME",
          organizerName: null,
          competitionLabel: "Meisterschaft",
          meetingTime: null,
          resultLabel: null,
          intermediateResultLabel: null,
          season: { key: "2025/26" },
          team: { name: "Team A", shortName: null, alternativeName: null },
          opponentExternalClub: {
            name: "FC Gegner",
            shortName: null,
            alternativeName: null,
            logoUrl: "https://cdn.example/opp.png",
          },
        },
        opponentName: "FC Gegner",
        ownTeamDisplayName: "Team A",
        tenantClubName: "Heimverein",
        tenantLogoUrl: "https://cdn.example/home.png",
        canonicalLogoByProviderClubId: new Map(),
      });

      expect(presentation?.competitionLabel).toBe("Meisterschaft");
      expect(presentation?.home.logoUrl).toBe("https://cdn.example/home.png");
      expect(presentation?.away.logoUrl).toBe("https://cdn.example/opp.png");
    });
  });

  describe("buildCommandCenterTournamentParticipants", () => {
    it("returns serializable participant rows with resolved logos", () => {
      const participants = buildCommandCenterTournamentParticipants(
        [
          {
            displayName: "Team Rot",
            manualLabel: null,
            displayOrder: 0,
            team: { name: "Team Rot", shortName: null, alternativeName: null },
            externalClub: null,
            externalTeam: null,
          },
        ],
        "https://cdn.example/tenant.png",
        EMPTY_TOURNAMENT_LOGO_RESOLUTION_CONTEXT,
      );

      expect(participants).toEqual([
        {
          displayName: "Team Rot",
          logoUrl: "https://cdn.example/tenant.png",
        },
      ]);
    });
  });
});
