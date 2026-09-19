/**
 * @vitest-environment jsdom
 *
 * TURNIERE-UX-02A — create flow shares Veranstalter Verein picker with edit.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentCreateForm from "../TournamentCreateForm";
import { TOURNAMENT_FORM_TEST_SCHEDULE_PROPS } from "./tournament-form-test-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TournamentCreateForm — Veranstalter picker (TURNIERE-UX-02A)", () => {
  it("uses the same searchable Verein picker (no free-text Organisator field)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/seasons") {
          return jsonResponse({
            seasons: [{ id: "season-1", key: "2025-2026", name: "Saison 2025/2026", isActive: true }],
          });
        }
        if (url.startsWith("/api/planning/writable-teams")) {
          return jsonResponse({ teams: [] });
        }
        if (url.startsWith("/api/facilities/availability")) {
          return jsonResponse({ availability: [] });
        }
        throw new Error(url);
      }),
    );

    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        {...TOURNAMENT_FORM_TEST_SCHEDULE_PROPS}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("tournament-create-organizer-club")).toBeInTheDocument());
    expect(screen.getByPlaceholderText("Verein suchen…")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("z. B. FC Aesch")).not.toBeInTheDocument();
  });
});
