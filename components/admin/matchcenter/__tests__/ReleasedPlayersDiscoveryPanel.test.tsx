/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReleasedPlayersDiscoveryPanel from "@/components/admin/matchcenter/ReleasedPlayersDiscoveryPanel";

describe("ReleasedPlayersDiscoveryPanel", () => {
  it("shows entry button before expanding discovery", () => {
    render(
      <ReleasedPlayersDiscoveryPanel eventId="event-1" variant="match" canMutateSquad />,
    );
    expect(screen.getByTestId("released-players-discovery-open")).toBeInTheDocument();
  });

  it("loads discovery API when opened", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ canRequest: true, players: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReleasedPlayersDiscoveryPanel eventId="event-1" variant="match" canMutateSquad />,
    );
    await userEvent.click(screen.getByTestId("released-players-discovery-open"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/matchcenter/event-1/released-players",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
