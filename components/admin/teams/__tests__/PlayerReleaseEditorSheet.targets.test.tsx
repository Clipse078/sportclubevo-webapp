/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayerReleaseEditorSheet from "@/components/admin/teams/PlayerReleaseEditorSheet";

describe("PlayerReleaseEditorSheet — activity target discovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads target teams using initialPersonId without waiting for form.personId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        targetOptions: [
          {
            teamSeasonId: "ts-b2",
            teamId: "team-b2",
            label: "Junioren B2",
            secondaryLabel: "B",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PlayerReleaseEditorSheet
        open
        onClose={() => {}}
        apiBase="/api/teams/t1/team-seasons/ts1/player-releases"
        editing={null}
        initialPersonId="person-1"
        initialPersonDisplayName="SCE Testspieler 02"
        rosterPlayers={[{ personId: "person-1", displayName: "SCE Testspieler 02" }]}
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
        "/api/teams/t1/team-seasons/ts1/player-releases/target-teams?personId=person-1",
      );
    });
  });
});
