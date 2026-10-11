/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayerReleaseEditorSheet from "@/components/admin/teams/PlayerReleaseEditorSheet";

const rosterPlayers = [
  { personId: "person-01", displayName: "SCE Testspieler 01" },
  { personId: "person-02", displayName: "SCE Testspieler 02" },
  { personId: "person-03", displayName: "SCE Testspieler 03" },
];

function targetResponse(teamSeasonId: string, label: string) {
  return {
    ok: true,
    json: async () => ({
      targetOptions: [
        {
          teamSeasonId,
          teamId: `team-${teamSeasonId}`,
          label,
          secondaryLabel: "B",
        },
      ],
    }),
  };
}

describe("PlayerReleaseEditorSheet — target discovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads target teams using initialPersonId without waiting for form.personId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(targetResponse("ts-b2", "Junioren B2"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PlayerReleaseEditorSheet
        open
        onClose={() => {}}
        apiBase="/api/teams/t1/team-seasons/ts1/player-releases"
        editing={null}
        initialPersonId="person-02"
        initialPersonDisplayName="SCE Testspieler 02"
        rosterPlayers={[rosterPlayers[1]!]}
        context={{
          mode: "ACTIVITY",
          eventId: "match-1",
          scopeLabel: "Spiel · Junioren B1",
        }}
        onSaved={() => {}}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/teams/t1/team-seasons/ts1/player-releases/target-teams?personId=person-02",
      );
    });

    expect(await screen.findByTestId("player-release-target-picker-search")).not.toBeDisabled();
  });

  it("loads targets after period player selection and enables the picker", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(targetResponse("ts-b2", "Junioren B2"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PlayerReleaseEditorSheet
        open
        onClose={() => {}}
        apiBase="/api/teams/t1/team-seasons/ts1/player-releases"
        editing={null}
        rosterPlayers={rosterPlayers}
        context={{ mode: "PERIOD" }}
        onSaved={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Spieler/i }), {
      target: { value: "person-03" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/teams/t1/team-seasons/ts1/player-releases/target-teams?personId=person-03",
      );
    });

    const pickerSearch = await screen.findByTestId("player-release-target-picker-search");
    expect(pickerSearch).not.toBeDisabled();
    expect(screen.queryByText("Keine passenden Zielteams gefunden.")).not.toBeInTheDocument();
  });

  it("refreshes targets when the period player changes and ignores stale responses", async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce(targetResponse("ts-a", "Junioren A"))
      .mockResolvedValueOnce(targetResponse("ts-c2", "Junioren C2"));

    vi.stubGlobal("fetch", fetchMock);

    render(
      <PlayerReleaseEditorSheet
        open
        onClose={() => {}}
        apiBase="/api/teams/t1/team-seasons/ts1/player-releases"
        editing={null}
        rosterPlayers={rosterPlayers}
        context={{ mode: "PERIOD" }}
        onSaved={() => {}}
      />,
    );

    const playerSelect = screen.getByRole("combobox", { name: /Spieler/i });

    fireEvent.change(playerSelect, { target: { value: "person-01" } });
    fireEvent.change(playerSelect, { target: { value: "person-02" } });
    fireEvent.change(playerSelect, { target: { value: "person-03" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/teams/t1/team-seasons/ts1/player-releases/target-teams?personId=person-03",
      );
    });

    resolveFirst(targetResponse("ts-stale", "Stale Team"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    await waitFor(() => {
      expect(screen.queryByText("Keine passenden Zielteams gefunden.")).not.toBeInTheDocument();
    });
  });
});
