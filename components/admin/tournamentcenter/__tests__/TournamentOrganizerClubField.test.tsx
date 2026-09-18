/**
 * @vitest-environment jsdom
 *
 * TURNIERE-UX-02A — Veranstalter uses canonical Club Directory picker (not free text).
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentOrganizerClubField from "../TournamentOrganizerClubField";

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

const FC_ALLSCHWIL = { id: "club-fca", name: "FC Allschwil", shortName: null, logoUrl: "https://cdn/fca.png" };
const FC_AESCH = { id: "club-aesch", name: "FC Aesch", shortName: null, logoUrl: null };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TournamentOrganizerClubField", () => {
  it("does not render a free-text input for Veranstalter", () => {
    render(<TournamentOrganizerClubField selected={null} onChange={() => {}} />);
    expect(screen.queryByRole("textbox", { name: /veranstalter/i })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Verein suchen…")).toBeInTheDocument();
  });

  it("searches canonical club directory and selects FC Allschwil", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (!url.startsWith("/api/club-directory/clubs")) {
          throw new Error(url);
        }
        const search = new URL(url, "http://localhost").searchParams.get("search")?.toLowerCase() ?? "";
        const clubs = [FC_ALLSCHWIL, FC_AESCH].filter((c) => c.name.toLowerCase().includes(search));
        return jsonResponse({ clubs });
      }),
    );

    const onChange = vi.fn();
    render(<TournamentOrganizerClubField selected={null} onChange={onChange} testId="organizer-test" />);

    fireEvent.change(screen.getByTestId("organizer-test-picker-input"), { target: { value: "Al" } });
    await screen.findByTestId("organizer-test-picker-option-club-fca");
    fireEvent.mouseDown(screen.getByTestId("organizer-test-picker-option-club-fca"));

    expect(onChange).toHaveBeenCalledWith(FC_ALLSCHWIL);
  });

  it("renders legacy organizer chip when Verein is no longer in directory", () => {
    render(
      <TournamentOrganizerClubField
        selected={{
          id: "__legacy-organizer__",
          name: "Deleted Verein AG",
          shortName: null,
          logoUrl: null,
        }}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("Deleted Verein AG")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Verein suchen…")).not.toBeInTheDocument();
  });
});
