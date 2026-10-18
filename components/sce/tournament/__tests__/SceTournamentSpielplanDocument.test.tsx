/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceTournamentSpielplanDocument from "../SceTournamentSpielplanDocument";
import SceTournamentTeamSpielplanDocument from "../SceTournamentTeamSpielplanDocument";
import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";

const model: TournamentSpielplanViewModel = {
  identity: {
    tournamentId: "t1",
    title: "Testturnier",
    dateLabel: "Samstag, 1. August 2026",
    location: "Halle",
    organizerName: "FC Test",
    tenantName: "FC Test",
    tenantLogoUrl: null,
    timezone: "Europe/Zurich",
  },
  pitches: [{ pitchId: "p1", displayOrder: 0, label: "Feld 1" }],
  fixtures: [],
  matrixRows: [
    {
      kind: "ALL_PITCHES_BREAK",
      rowId: "b1",
      startUtc: "2026-08-01T09:00:00.000Z",
      endUtc: "2026-08-01T09:15:00.000Z",
      timeLabel: "11:00–11:15",
      label: "Pause",
    },
    {
      kind: "SCHEDULE_SLOT",
      rowId: "s1",
      startUtc: "2026-08-01T08:00:00.000Z",
      timeLabel: "10:00",
      roundTitle: "Runde 1",
      cellsByPitchId: {
        p1: {
          kind: "FIXTURE",
          fixtureId: "f1",
          pairingLabel: "Alpha – Beta",
          sideAParticipantId: "a",
          sideBParticipantId: "b",
          result: null,
        },
      },
    },
  ],
  mobileSlots: [],
  participants: [
    { participantId: "a", displayName: "Alpha", crestUrl: null },
    { participantId: "b", displayName: "Beta", crestUrl: null },
  ],
  teamPlans: [
    {
      participantId: "a",
      displayName: "Alpha",
      crestUrl: null,
      entries: [
        {
          kind: "MATCH",
          fixtureId: "f1",
          startUtc: "2026-08-01T08:00:00.000Z",
          timeLabel: "10:00",
          pitchLabel: "Feld 1",
          opponentLabel: "Beta",
          roundTitle: "Runde 1",
          result: null,
          scoreLabel: null,
        },
      ],
    },
  ],
};

describe("Spielplan print documents", () => {
  it("master print composition includes metadata and schedule content", () => {
    render(<SceTournamentSpielplanDocument model={model} />);
    expect(screen.getByTestId("sce-tournament-spielplan-document")).toBeInTheDocument();
    expect(screen.getByText("Testturnier")).toBeInTheDocument();
    expect(screen.getByText("Feld 1")).toBeInTheDocument();
    expect(screen.getByText(/Alpha – Beta/)).toBeInTheDocument();
    expect(screen.getByText(/Pause/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("team print composition includes team identity and opponent", () => {
    render(
      <SceTournamentTeamSpielplanDocument model={model} teamPlan={model.teamPlans[0]!} />,
    );
    expect(screen.getByTestId("sce-tournament-team-spielplan-document")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText(/vs Beta/)).toBeInTheDocument();
  });
});
