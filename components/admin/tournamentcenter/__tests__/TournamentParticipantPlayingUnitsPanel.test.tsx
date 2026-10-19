/**
 * @vitest-environment jsdom
 *
 * SCE-TOURNAMENT-PLANNER-02C R2 — Spielteams panel UAT regression
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TournamentParticipantPlayingUnitsPanel from "../TournamentParticipantPlayingUnitsPanel";

const TOURNAMENT_ID = "tournament-1";
const PARTICIPANT_ID = "participant-1";
const DISPLAY_NAME = "FC Allschwil Junioren E1";

function mockFetchSequence(handlers: Array<(url: string, init?: RequestInit) => Response | Promise<Response>>) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const handler = handlers[call] ?? handlers[handlers.length - 1]!;
      call += 1;
      return handler(url, init);
    }),
  );
}

describe("TournamentParticipantPlayingUnitsPanel — R2 UAT regression", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads zero persisted units as implicit full team without load error", async () => {
    mockFetchSequence([
      () =>
        new Response(
          JSON.stringify({
            persistedUnits: [],
            effectiveUnits: [
              {
                id: `implicit-full:${PARTICIPANT_ID}`,
                tournamentParticipantId: PARTICIPANT_ID,
                displayName: DISPLAY_NAME,
                mode: "FULL",
                capacityPartitionKey: null,
                displayOrder: 0,
                isPersisted: false,
              },
            ],
            usesImplicitFullTeam: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ]);

    render(
      <TournamentParticipantPlayingUnitsPanel
        tournamentId={TOURNAMENT_ID}
        participantId={PARTICIPANT_ID}
        participantDisplayName={DISPLAY_NAME}
        canManage
      />,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("playing-units-load-error")).not.toBeInTheDocument();
    });
    expect(screen.getByText(DISPLAY_NAME)).toBeInTheDocument();
    expect(screen.getByText("Ganzes Team")).toBeInTheDocument();
  });

  it("shows split result immediately and surfaces mutation errors", async () => {
    mockFetchSequence([
      () =>
        new Response(
          JSON.stringify({
            persistedUnits: [],
            effectiveUnits: [
              {
                id: `implicit-full:${PARTICIPANT_ID}`,
                tournamentParticipantId: PARTICIPANT_ID,
                displayName: DISPLAY_NAME,
                mode: "FULL",
                capacityPartitionKey: null,
                displayOrder: 0,
                isPersisted: false,
              },
            ],
            usesImplicitFullTeam: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      () =>
        new Response(JSON.stringify({ error: "Spielteams konnten nicht erstellt werden." }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
    ]);

    render(
      <TournamentParticipantPlayingUnitsPanel
        tournamentId={TOURNAMENT_ID}
        participantId={PARTICIPANT_ID}
        participantDisplayName={DISPLAY_NAME}
        canManage
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`tournament-participant-${PARTICIPANT_ID}-split-team`)).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId(`tournament-participant-${PARTICIPANT_ID}-split-team`));

    await waitFor(() => {
      expect(screen.getByTestId("playing-units-mutation-error")).toHaveTextContent(
        /konnten nicht erstellt/i,
      );
    });
  });

  it("reconciles persisted units after successful split without full-panel loading swap", async () => {
    const created = [
      {
        id: "u1",
        tournamentParticipantId: PARTICIPANT_ID,
        displayName: `${DISPLAY_NAME}-1`,
        mode: "SUBUNIT",
        capacityPartitionKey: null,
        displayOrder: 0,
        isPersisted: true,
      },
      {
        id: "u2",
        tournamentParticipantId: PARTICIPANT_ID,
        displayName: `${DISPLAY_NAME}-2`,
        mode: "SUBUNIT",
        capacityPartitionKey: null,
        displayOrder: 1,
        isPersisted: true,
      },
    ];

    mockFetchSequence([
      () =>
        new Response(
          JSON.stringify({
            persistedUnits: [],
            effectiveUnits: [
              {
                id: `implicit-full:${PARTICIPANT_ID}`,
                tournamentParticipantId: PARTICIPANT_ID,
                displayName: DISPLAY_NAME,
                mode: "FULL",
                capacityPartitionKey: null,
                displayOrder: 0,
                isPersisted: false,
              },
            ],
            usesImplicitFullTeam: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      () =>
        new Response(JSON.stringify({ units: created }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      () =>
        new Response(
          JSON.stringify({
            persistedUnits: created,
            effectiveUnits: created,
            usesImplicitFullTeam: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ]);

    render(
      <TournamentParticipantPlayingUnitsPanel
        tournamentId={TOURNAMENT_ID}
        participantId={PARTICIPANT_ID}
        participantDisplayName={DISPLAY_NAME}
        canManage
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`tournament-participant-${PARTICIPANT_ID}-split-team`)).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId(`tournament-participant-${PARTICIPANT_ID}-split-team`));

    await waitFor(() => {
      expect(screen.getByDisplayValue(`${DISPLAY_NAME}-1`)).toBeInTheDocument();
      expect(screen.getByDisplayValue(`${DISPLAY_NAME}-2`)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("playing-units-loading")).not.toBeInTheDocument();
  });
});
