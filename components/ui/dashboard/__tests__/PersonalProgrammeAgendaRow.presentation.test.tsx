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

describe("PersonalProgrammeAgendaRow — SCE-ACTIVITY-UX-01R1", () => {
  const startAt = new Date("2026-10-10T15:00:00.000Z");
  const endAt = new Date("2026-10-10T16:30:00.000Z");

  it("shows meaningful second line for training with venue/resource", () => {
    const activityPresentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      teamName: "Junioren F2",
      startAt,
      endAt,
      clubContextName: "FC Allschwil",
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
    expect(screen.queryByText("TRAINING")).not.toBeInTheDocument();
    expect(screen.getByText(/FC Allschwil/)).toBeInTheDocument();
    expect(screen.getByText(/Im Brüel/)).toBeInTheDocument();
    expect(screen.getByText(/KR2/)).toBeInTheDocument();
    expect(screen.queryByText(/Junioren F2 ·/)).not.toBeInTheDocument();
  });

  it("shows match fixture and away context without repeating start time", () => {
    const activityPresentation = buildMatchActivityPresentation({
      resourceKey: "event:1",
      title: "Spiel",
      typeLabel: "Spiel",
      teamName: "1. Mannschaft",
      opponentName: "BSC Old Boys",
      homeAway: "AWAY",
      location: "Schützenmatte, Basel",
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

    expect(screen.getByText(/BSC Old Boys/)).toBeInTheDocument();
    expect(screen.getByText(/Auswärts/)).toBeInTheDocument();
    expect(screen.getByText(/Schützenmatte, Basel/)).toBeInTheDocument();
    const secondary = screen.getByText(/Auswärts · Schützenmatte, Basel/);
    expect(secondary.textContent).not.toMatch(/16:00/);
  });

  it("shows tournament team context and organiser/venue metadata", () => {
    const activityPresentation = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      teamName: "Junioren F2",
      organiserName: "FC Arisdorf",
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

    expect(screen.getByText("PlayMore Turnier · Junioren F2")).toBeInTheDocument();
    expect(screen.getByText(/FC Arisdorf/)).toBeInTheDocument();
    expect(screen.getByText(/Gemeindesportplatz/)).toBeInTheDocument();
  });
});
