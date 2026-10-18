/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TournamentSpielplanMobileTimeline from "../TournamentSpielplanMobileTimeline";
import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";
import { SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER } from "@/lib/sce/tournament/sce-tournament-schedule-break-semantics";

function baseModel(
  partial: Partial<TournamentSpielplanViewModel>,
): TournamentSpielplanViewModel {
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
    fixtures: [],
    matrixRows: [],
    mobileSlots: [],
    presentationItems: [],
    participants: [],
    teamPlans: [],
    ...partial,
  };
}

describe("TournamentSpielplanMobileTimeline — 01L pause + a11y", () => {
  it("renders ALL_PITCHES break with canonical amber presentation", () => {
    render(
      <TournamentSpielplanMobileTimeline
        model={baseModel({
          mobileSlots: [
            {
              slotId: "b1",
              startUtc: "2026-08-01T09:00:00.000Z",
              timeLabel: "11:00–11:15",
              roundTitle: null,
              kind: "ALL_PITCHES_BREAK",
              breakLabel: "Pause",
              pitches: [],
            },
          ],
        })}
      />,
    );
    const block = screen.getByTestId("spielplan-mobile-all-pitches-break");
    expect(block).toHaveAttribute("data-sce-schedule-break", SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER);
    expect(block).toHaveAttribute("aria-label", expect.stringContaining("Pause"));
    expect(block).toHaveAttribute("aria-label", expect.stringContaining("alle Felder"));
  });

  it("renders pitch-blocked cells with explicit label and scope", () => {
    render(
      <TournamentSpielplanMobileTimeline
        model={baseModel({
          fixtures: [
            {
              fixtureId: "f1",
              sideALabel: "A",
              sideBLabel: "B",
              sideAParticipantId: "a",
              sideBParticipantId: "b",
              sideAIsPlaceholder: false,
              sideBIsPlaceholder: false,
              pairingLabel: "A – B",
              startUtc: "2026-08-01T09:00:00.000Z",
              endUtc: "2026-08-01T09:14:00.000Z",
              pitchId: "p1",
              pitchLabel: "Feld 1",
              roundTitle: null,
              result: null,
            },
          ],
          mobileSlots: [
            {
              slotId: "s1",
              startUtc: "2026-08-01T09:00:00.000Z",
              timeLabel: "11:00",
              roundTitle: "Runde 1",
              kind: "FIXTURES",
              pitches: [
                {
                  pitchLabel: "Feld 1",
                  cell: { kind: "PITCH_BLOCKED", label: "Pause" },
                },
              ],
            },
          ],
        })}
      />,
    );
    const blocked = screen.getByTestId("spielplan-mobile-pitch-blocked");
    expect(blocked).toHaveAttribute("data-sce-schedule-break", SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER);
    expect(blocked).toHaveAttribute("aria-label", expect.stringContaining("Feld 1"));
  });
});
