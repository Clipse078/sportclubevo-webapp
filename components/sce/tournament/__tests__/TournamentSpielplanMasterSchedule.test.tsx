/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TournamentSpielplanMasterSchedule from "../TournamentSpielplanMasterSchedule";
import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";

const baseFixture = {
  fixtureId: "f1",
  sideALabel: "A",
  sideBLabel: "B",
  sideAParticipantId: "a",
  sideBParticipantId: "b",
  sideAIsPlaceholder: false,
  sideBIsPlaceholder: false,
  pairingLabel: "A – B",
  startUtc: "2026-08-01T08:00:00.000Z",
  endUtc: "2026-08-01T08:14:00.000Z",
  pitchId: "p1",
  pitchLabel: "Feld 1",
  roundTitle: "Runde 1",
  result: null,
};

function model(partial: Partial<TournamentSpielplanViewModel>): TournamentSpielplanViewModel {
  return {
    identity: {
      tournamentId: "t1",
      title: "Test",
      dateLabel: "Samstag",
      location: null,
      organizerName: null,
      tenantName: null,
      tenantLogoUrl: null,
      timezone: "Europe/Zurich",
    },
    pitches: [{ pitchId: "p1", displayOrder: 0, label: "Feld 1" }],
    fixtures: [baseFixture],
    matrixRows: [],
    mobileSlots: [],
    presentationItems: [],
    participants: [
      { participantId: "a", displayName: "A", crestUrl: null },
      { participantId: "b", displayName: "B", crestUrl: null },
    ],
    teamPlans: [],
    ...partial,
  };
}

describe("TournamentSpielplanMasterSchedule", () => {
  it("renders grouped fixture cards for master Spielplan", () => {
    render(
      <TournamentSpielplanMasterSchedule
        model={model({
          presentationItems: [
            {
              kind: "ROUND_GROUP",
              group: {
                sectionId: "r1",
                title: "Runde 1",
                timeRangeLabel: "10:00–10:14",
                pitchSummaryLabel: "Feld 1",
                fixtureCount: 1,
                fixtures: [baseFixture],
              },
            },
          ],
        })}
      />,
    );
    expect(screen.getByTestId("spielplan-master-schedule")).toBeInTheDocument();
    expect(screen.getByTestId("spielplan-round-group-r1")).toBeInTheDocument();
    expect(screen.getByTestId("sce-tournament-fixture-card-f1")).toBeInTheDocument();
  });

  it("renders ALL_PITCHES break as full-width interruption", () => {
    render(
      <TournamentSpielplanMasterSchedule
        model={model({
          presentationItems: [
            {
              kind: "SCHEDULE_BREAK",
              break: {
                breakId: "br1",
                scope: "ALL_PITCHES",
                timeLabel: "11:00–11:15",
                label: "Pause",
                scopeLabel: "Alle Felder",
              },
            },
          ],
        })}
      />,
    );
    expect(screen.getByTestId("spielplan-all-pitches-break")).toBeInTheDocument();
    expect(screen.getByText(/Pause/)).toBeInTheDocument();
  });

  it("preserves team highlight visibility for all fixtures", () => {
    render(
      <TournamentSpielplanMasterSchedule
        model={model({
          presentationItems: [
            {
              kind: "ROUND_GROUP",
              group: {
                sectionId: "r1",
                title: "Runde 1",
                timeRangeLabel: null,
                pitchSummaryLabel: null,
                fixtureCount: 1,
                fixtures: [baseFixture],
              },
            },
          ],
        })}
        highlightParticipantId="a"
      />,
    );
    expect(screen.getByTestId("sce-tournament-fixture-card-f1")).toBeInTheDocument();
  });
});
