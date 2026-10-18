import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicTournamentExperience from "../PublicTournamentExperience";
import type { PublicTournamentViewModel } from "@/lib/tournaments/public/types";

const model: PublicTournamentViewModel = {
  tournament: {
    id: "t1",
    title: "Jugendturnier",
    description: null,
    location: "Halle",
    startAt: "2026-08-01T08:00:00.000Z",
    endAt: "2026-08-01T17:00:00.000Z",
    meetingTime: null,
    organizerName: "FC Allschwil",
    organizerLogoUrl: null,
    competitionLabel: null,
    status: "SCHEDULED",
    season: null,
  },
  participants: [{ id: "p1", displayName: "Team A", crestUrl: null }],
  scheduleSections: [
    {
      sectionId: "s1",
      title: "Gruppe A",
      entries: [
        {
          kind: "FIXTURE",
          fixtureId: "f1",
          sideA: {
            label: "Team A",
            crestUrl: null,
            isPlaceholder: false,
            participantId: "p1",
            qualificationProvenanceLabel: null,
          },
          sideB: {
            label: "1. Gruppe B",
            crestUrl: null,
            isPlaceholder: true,
            participantId: null,
            qualificationProvenanceLabel: null,
          },
          startUtc: "2026-08-01T09:00:00.000Z",
          endUtc: "2026-08-01T09:20:00.000Z",
          pitchLabel: "Feld 1",
          phaseLabel: null,
          groupLabel: "Gruppe A",
          phaseType: "GROUP_MIX",
          result: null,
          accessibleLabel: "Team A gegen 1. Gruppe B",
          scheduleState: "UPCOMING",
        },
      ],
    },
  ],
  mobileTimeline: [],
  groupStandings: [],
  publication: {
    websiteVisible: true,
    homepageVisible: false,
    wochenplanVisible: false,
    teamPageVisible: false,
  },
  publicPath: "/public/fc-allschwil/turniere/t1",
  generatedAt: new Date().toISOString(),
};

describe("PublicTournamentExperience", () => {
  it("renders schedule and copy-link without admin controls", () => {
    render(
      <PublicTournamentExperience
        model={model}
        tenantName="FC Allschwil"
        absolutePublicUrl="https://example.test/public/fc-allschwil/turniere/t1"
      />,
    );
    expect(screen.getByRole("heading", { name: "Jugendturnier" })).toBeInTheDocument();
    expect(screen.getByTestId("public-tournament-copy-link")).toBeInTheDocument();
    expect(screen.getByText("1. Gruppe B")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Spielplan automatisch/i })).not.toBeInTheDocument();
  });
});
