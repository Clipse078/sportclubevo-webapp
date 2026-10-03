/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityTypePill } from "@/components/sporting-activity/ActivityTypePill";
import { SportingActivityMetaRail } from "@/components/sporting-activity/SportingActivityMetaRail";
import { PersonalProgrammeAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeAgendaRow";
import { activityVisualStyle } from "@/lib/planning-hub/activity-visual-style";
import {
  buildMatchActivityPresentation,
  buildTrainingActivityPresentation,
  buildTournamentActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { SpieleManagementMatchIdentity } from "@/components/sporting-activity/SpieleManagementMatchIdentity";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import { buildSpieleManagementActivityPresentation } from "@/lib/sporting-activity-presentation/management-match-presentation";
import { calendarItemToProgrammeAgendaItem } from "@/lib/personal-agenda/calendar-item-to-programme-item";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { WeekplannerActivityIdentityCard } from "@/components/admin/planner/WeekplannerActivityEditorShell";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "de-CH",
}));

describe("SCE-ACTIVITY-DESIGN-01C01D — canonical activity semantics", () => {
  it("maps TRAINING/SPIEL/TURNIER to blue/red/orange tokens", () => {
    render(<ActivityTypePill activityKind="TRAINING" label="TRAINING" />);
    expect(screen.getByText("TRAINING").getAttribute("data-activity-type-pill")).toBe(
      "training-blue",
    );
    render(<ActivityTypePill activityKind="MATCH" label="SPIEL" />);
    expect(screen.getByText("SPIEL").getAttribute("data-activity-type-pill")).toBe("match-red");
    render(<ActivityTypePill activityKind="TOURNAMENT" label="TURNIER" />);
    expect(screen.getByText("TURNIER").getAttribute("data-activity-type-pill")).toBe(
      "tournament-orange",
    );
  });

  it("orders meta rail type pill before canonical time range", () => {
    render(
      <SportingActivityMetaRail
        activityKind="TRAINING"
        typeLabel="TRAINING"
        startTimeLabel="17:00"
        endTimeLabel="18:30"
      />,
    );
    const rail = screen.getByTestId("sporting-activity-meta-rail");
    const pill = screen.getByText("TRAINING");
    const time = screen.getByTestId("sporting-activity-meta-rail-time");
    expect(rail.contains(pill)).toBe(true);
    expect(rail.contains(time)).toBe(true);
    expect(time).toHaveTextContent("17:00–18:30");
    expect(screen.queryByTestId("sporting-activity-meta-rail-end")).not.toBeInTheDocument();
    expect(
      pill.compareDocumentPosition(time) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("SCE-ACTIVITY-DESIGN-01C01D — Mein Programm compact row", () => {
  const startAt = new Date("2026-10-10T15:00:00.000Z");

  function baseItem(overrides: Partial<PersonalProgrammeItem>): PersonalProgrammeItem {
    return {
      id: "training:1",
      sourceType: "TRAINING",
      startsAt: startAt,
      title: "Fallback",
      typeLabel: "Training",
      deepLink: "/dashboard/activity/training-session/1",
      ariaLabel: "Training",
      ...overrides,
    };
  }

  it("places pill on meta rail without duplicating in identity body", () => {
    const activityPresentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      clubName: "FC Allschwil",
      startAt,
      facilityName: "Im Brüel",
    });

    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({ activityPresentation })}
        timeLabel="17:00"
      />,
    );

    expect(screen.getAllByText("TRAINING")).toHaveLength(1);
    expect(screen.getByTestId("sporting-activity-meta-rail")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("sporting-activity-identity")
        .querySelector("[data-activity-type-pill]"),
    ).toBeNull();
  });

  it("shows tournament Auswärts beside title and single time range on meta rail", () => {
    const endAt = new Date("2026-10-10T09:30:00.000Z");
    const activityPresentation = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      homeAway: "AWAY",
      organiserName: "FC Arisdorf",
      location: "Gemeindesportplatz",
      startAt,
      endAt,
    });

    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({
          sourceType: "TOURNAMENT",
          activityPresentation,
          endsAt: endAt,
        })}
        timeLabel="09:30"
        endTimeLabel="11:30"
      />,
    );

    expect(screen.getByTestId("sporting-activity-meta-rail-time")).toHaveTextContent(
      "09:30–11:30",
    );
    expect(screen.queryByTestId("sporting-activity-meta-rail-end")).not.toBeInTheDocument();
    const identity = screen.getByTestId("sporting-activity-identity");
    expect(identity.textContent).toMatch(/PlayMore Turnier.*Auswärts/s);
  });

  it("retains activity detail link", () => {
    const activityPresentation = buildMatchActivityPresentation({
      resourceKey: "event:1",
      title: "Spiel",
      typeLabel: "Spiel",
      teamName: "FC Allschwil",
      opponentName: "FC Binningen",
      homeAway: "HOME",
      startAt,
      tenantClubName: "FC Allschwil",
    });

    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({
          sourceType: "MATCH",
          activityPresentation,
          deepLink: "/dashboard/activity/event/e1",
        })}
        timeLabel="18:00"
      />,
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("/dashboard/activity/event/e1");
  });
});

describe("SCE-ACTIVITY-DESIGN-01C01D — Wochenplaner semantic colors", () => {
  it("uses canonical match red (not legacy green) for MATCH blocks", () => {
    const matchStyle = activityVisualStyle("MATCH");
    expect(matchStyle.leftAccentClass).toContain("--sce-secondary");
    expect(matchStyle.leftAccentClass).not.toContain("emerald");
  });

  it("keeps VERANSTALTUNG distinct from sporting types", () => {
    const eventStyle = activityVisualStyle("VERANSTALTUNG");
    expect(eventStyle.semanticType).toBe("VERANSTALTUNG");
    expect(eventStyle.leftAccentClass).not.toContain("--sce-info");
  });
});

describe("SCE-ACTIVITY-DESIGN-01C01D — Matchcenter identity", () => {
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

  function createMatch(): MatchcenterMatchSummary {
    return {
      id: "m1",
      tenantId: "t1",
      teamId: "team-1",
      seasonId: "s1",
      type: "MATCH",
      title: "BSC Old Boys – 1. Mannschaft",
      description: null,
      status: "SCHEDULED",
      startAt: new Date("2027-03-05T16:00:00.000Z"),
      endAt: new Date("2027-03-05T18:00:00.000Z"),
      operationalEndAtOverride: null,
      operationalEndAt: new Date("2027-03-05T18:00:00.000Z"),
      location: "Schützenmatte, Basel",
      competitionLabel: "2. Liga interregional",
      homeAway: "AWAY",
      resultLabel: null,
      intermediateResultLabel: null,
      scoreHome: null,
      scoreAway: null,
      home: side({ displayName: "BSC Old Boys", isOwnTeam: false }),
      away: side({ displayName: "1. Mannschaft", isOwnTeam: true }),
      source: {} as MatchcenterMatchSummary["source"],
      synchronization: {} as MatchcenterMatchSummary["synchronization"],
      operational: {} as MatchcenterMatchSummary["operational"],
    };
  }

  it("renders home left, away right, and SPIEL meta rail", () => {
    const match = createMatch();
    const presentation = buildSpieleManagementActivityPresentation(match, {
      tenantClubName: "FC Allschwil",
    });

    render(
      <SpieleManagementMatchIdentity
        match={match}
        activityPresentation={presentation}
        kickoffLabel="16:00"
        endTimeLabel="18:00"
        competitionLabel="2. Liga interregional"
      />,
    );

    expect(screen.getByText("SPIEL")).toBeInTheDocument();
    expect(screen.getByTestId("match-club-pair")).toBeInTheDocument();
    expect(screen.getByText("BSC Old Boys")).toBeInTheDocument();
    expect(screen.getByText("1. Mannschaft")).toBeInTheDocument();
    expect(screen.getByText("Auswärts")).toBeInTheDocument();
  });
});

describe("SCE-ACTIVITY-DESIGN-01C01D-R1 — planning editor identity", () => {
  it("uses blue TRAINING pill in Wochenplaner editor summary (not legacy green)", () => {
    const item = {
      type: "TRAINING",
      title: "Junioren F3 Training",
      teamNames: ["FC Allschwil Junioren F3"],
      canonicalStartAt: new Date("2026-10-02T15:15:00.000Z"),
      canonicalEndAt: new Date("2026-10-02T16:45:00.000Z"),
    } as WeekplannerTrainingItem;

    render(<WeekplannerActivityIdentityCard item={item} timezone="Europe/Zurich" />);

    expect(screen.getByText("TRAINING").getAttribute("data-activity-type-pill")).toBe(
      "training-blue",
    );
    expect(screen.queryByText("Heimspiel")).not.toBeInTheDocument();
    expect(screen.getByTestId("weekplanner-activity-identity-schedule").textContent).toMatch(
      /17:15–18:45/,
    );
  });
});

describe("SCE-ACTIVITY-DESIGN-01C01D — calendar selected-day mapping", () => {
  it("maps sporting calendar items to programme compact rows", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:9",
      title: "Training",
      typeLabel: "Training",
      startAt: new Date("2026-10-10T15:00:00.000Z"),
    });

    const item: NormalizedCalendarItem = {
      id: "training-session:9",
      sourceType: "training-session",
      sourceId: "9",
      semanticType: "TRAINING",
      title: "Training",
      startAt: new Date("2026-10-10T15:00:00.000Z"),
      allDay: false,
      deepLink: "/dashboard/activity/training-session/9",
      iconKey: "training",
      typeLabel: "Training",
      ariaLabel: "Training",
      activityPresentation: presentation,
    };

    const mapped = calendarItemToProgrammeAgendaItem(item);
    expect(mapped?.sourceType).toBe("TRAINING");
    expect(mapped?.deepLink).toContain("training-session/9");
  });
});
