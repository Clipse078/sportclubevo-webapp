/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammeAgendaRow } from "../PersonalProgrammeAgendaRow";
import {
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
  buildTrainingActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "de-CH",
}));

function baseItem(overrides: Partial<PersonalProgrammeItem>): PersonalProgrammeItem {
  return {
    id: "training:1",
    sourceType: "TRAINING",
    startsAt: new Date("2026-10-10T15:00:00.000Z"),
    title: "Fallback title",
    typeLabel: "Training",
    ariaLabel: "Training",
    ...overrides,
  };
}

describe("PersonalProgrammeAgendaRow — SCE-ACTIVITY-UX-01R6/R7 three-line Mein Programm", () => {
  const startAt = new Date("2026-10-10T15:00:00.000Z");
  const endAt = new Date("2026-10-10T16:30:00.000Z");
  const meinProgrammOpts = { tenantClubName: "FC Allschwil" };

  it("TRAINING — identity, TRAINING type, club - site venue", () => {
    const activityPresentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      teamName: "Junioren F2",
      clubName: meinProgrammOpts.tenantClubName,
      startAt,
      endAt,
      facilityName: "Im Brüel",
      pitchResourceName: "KR2",
    });

    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({ activityPresentation, title: activityPresentation.identity.title })}
        timeLabel="17:00"
      />,
    );

    expect(screen.getByText("Junioren F2 Training")).toBeInTheDocument();
    expect(screen.getByText("TRAINING")).toBeInTheDocument();
    expect(screen.getAllByText("TRAINING")).toHaveLength(1);
    expect(screen.getByText("TRAINING").getAttribute("data-activity-type-pill")).toBe(
      "training-blue",
    );
    expect(screen.getByTestId("sporting-activity-meta-rail")).toBeInTheDocument();
    expect(screen.getByText("FC Allschwil - Im Brüel")).toBeInTheDocument();
    expect(screen.getByText("FC Allschwil - Im Brüel").textContent).not.toMatch(
      /Junioren F2|KR2|Kunstrasen 2/,
    );
    expect(screen.queryByText(/Eigener Verein|Auswärts/)).not.toBeInTheDocument();
  });

  it("MATCH HOME — fixture, SPIEL + Eigener Verein, club - location", () => {
    const activityPresentation = buildMatchActivityPresentation({
      resourceKey: "event:home",
      title: "Spiel",
      typeLabel: "Spiel",
      teamName: "FC Allschwil",
      opponentName: "FC Binningen",
      homeAway: "HOME",
      location: "Im Brüel",
      pitchCode: "kr3",
      pitchLabel: "Kunstrasen 3",
      startAt,
      tenantClubName: "FC Allschwil",
    });

    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({
          sourceType: "MATCH",
          activityPresentation,
        })}
        timeLabel="18:00"
      />,
    );

    expect(screen.getByText(/FC Allschwil.*FC Binningen/)).toBeInTheDocument();
    expect(screen.getByText("SPIEL")).toBeInTheDocument();
    expect(screen.getByText("SPIEL").getAttribute("data-activity-type-pill")).toBe("match-red");
    expect(screen.getByText("Eigener Verein")).toHaveAttribute("data-activity-context-badge");
    expect(screen.getByText("FC Allschwil - Im Brüel")).toBeInTheDocument();
    expect(screen.queryByText(/Kunstrasen/)).not.toBeInTheDocument();
  });

  it("MATCH AWAY — fixture, SPIEL + Auswärts, host - location", () => {
    const activityPresentation = buildMatchActivityPresentation({
      resourceKey: "event:1",
      title: "Spiel",
      typeLabel: "Spiel",
      teamName: "FC Allschwil",
      opponentName: "FC Arisdorf",
      homeAway: "AWAY",
      location: "Gemeindesportplatz",
      startAt,
      tenantClubName: "FC Allschwil",
    });

    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({
          sourceType: "MATCH",
          activityPresentation,
          typeLabel: "Spiel",
        })}
        timeLabel="16:00"
      />,
    );

    expect(screen.getByText("FC Arisdorf – FC Allschwil")).toBeInTheDocument();
    expect(screen.getByText("SPIEL")).toBeInTheDocument();
    expect(screen.getByText("SPIEL").getAttribute("data-activity-type-pill")).toBe("match-red");
    expect(screen.getByText("FC Arisdorf - Gemeindesportplatz")).toBeInTheDocument();
    expect(screen.getByText("Auswärts")).toHaveAttribute("data-activity-context-badge");
    expect(screen.queryByText(/FC Allschwil -/)).not.toBeInTheDocument();
  });

  it("TOURNAMENT AWAY — title, TURNIER + Auswärts, organiser - location", () => {
    const activityPresentation = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      teamName: "Junioren F2",
      organiserName: "FC Arisdorf",
      homeAway: "AWAY",
      location: "Gemeindesportplatz",
      startAt,
    });

    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({
          sourceType: "TOURNAMENT",
          activityPresentation,
          typeLabel: "Turnier",
        })}
        timeLabel="09:30"
      />,
    );

    expect(screen.getByText("PlayMore Turnier")).toBeInTheDocument();
    expect(screen.getByText("TURNIER")).toBeInTheDocument();
    expect(screen.getByText("TURNIER").getAttribute("data-activity-type-pill")).toBe(
      "tournament-orange",
    );
    expect(screen.queryByText(/Junioren F2/)).not.toBeInTheDocument();
    expect(screen.getByText("FC Arisdorf - Gemeindesportplatz")).toBeInTheDocument();
    expect(screen.getByText("Auswärts")).toHaveAttribute("data-activity-context-badge");
  });

  it("TOURNAMENT HOME — title, TURNIER + Eigener Verein, organiser - location", () => {
    const activityPresentation = buildTournamentActivityPresentation({
      resourceKey: "event:th",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      teamName: "Junioren F2",
      organiserName: "FC Allschwil",
      homeAway: "HOME",
      tenantClubName: "FC Allschwil",
      location: "Im Brüel",
      startAt,
    });

    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({
          sourceType: "TOURNAMENT",
          activityPresentation,
        })}
        timeLabel="09:30"
      />,
    );

    expect(screen.getByText("PlayMore Turnier")).toBeInTheDocument();
    expect(screen.getByText("TURNIER")).toBeInTheDocument();
    expect(screen.getByText("TURNIER").getAttribute("data-activity-type-pill")).toBe(
      "tournament-orange",
    );
    expect(screen.getByText("Eigener Verein")).toHaveAttribute("data-activity-context-badge");
    expect(screen.getByText("FC Allschwil - Im Brüel")).toBeInTheDocument();
    expect(screen.queryByText(/Junioren F2/)).not.toBeInTheDocument();
  });

  it("does not fall back to subtitle/venue when activityPresentation is absent", () => {
    render(
      <PersonalProgrammeAgendaRow
        item={baseItem({
          subtitle: "Junioren F2",
          venue: "Gemeindesportplatz",
          activityPresentation: undefined,
        })}
        timeLabel="09:30"
      />,
    );

    expect(screen.queryByText(/Junioren F2 ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gemeindesportplatz/)).not.toBeInTheDocument();
    expect(screen.getByText("TRAINING")).toBeInTheDocument();
  });
});
