/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MergeClubForm from "../MergeClubForm";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("MergeClubForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ clubs: [] }),
    }) as unknown as typeof fetch;
  });

  const surviving = {
    id: "survivor",
    name: "US Olympia 1963",
    shortName: null,
    logoUrl: null,
    teamCount: 2,
    hasProviderMapping: true,
  };

  it("renders dark operational sections without white card classes", () => {
    const { container } = render(<MergeClubForm survivingClub={surviving} />);
    expect(screen.getByTestId("merge-club-form")).toBeInTheDocument();
    expect(screen.getByTestId("merge-surviving-club")).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/bg-white/);
    expect(container.innerHTML).not.toMatch(/bg-slate-50/);
  });

  it("shows initial empty search guidance", () => {
    render(<MergeClubForm survivingClub={surviving} />);
    expect(screen.getByTestId("merge-search-empty-initial")).toBeInTheDocument();
  });

  it("disables merge CTA without selection", () => {
    render(<MergeClubForm survivingClub={surviving} />);
    expect(screen.getByTestId("merge-primary-cta")).toBeDisabled();
  });

  it("shows no-results state when search returns empty", async () => {
    render(<MergeClubForm survivingClub={surviving} />);
    const input = screen.getByLabelText("Verein suchen");
    fireEvent.change(input, { target: { value: "zzznomatch" } });

    await waitFor(() => {
      expect(screen.getByTestId("merge-search-no-results")).toBeInTheDocument();
    });
  });

  it("enables merge CTA after selecting a duplicate", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clubs: [
            {
              id: "dup-1",
              name: "Dup Club",
              shortName: null,
              logoUrl: null,
              teamCount: 1,
              hasProviderMapping: false,
              archivedAt: null,
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          club: {
            id: "dup-1",
            name: "Dup Club",
            logoUrl: null,
            teams: [],
            providerMappings: [],
          },
        }),
      } as Response);

    render(<MergeClubForm survivingClub={surviving} />);
    fireEvent.change(screen.getByLabelText("Verein suchen"), { target: { value: "Dup" } });

    await waitFor(() => {
      expect(screen.getByText("Dup Club")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dup Club"));

    await waitFor(() => {
      expect(screen.getByTestId("merge-selected-list")).toBeInTheDocument();
    });

    expect(screen.getByTestId("merge-primary-cta")).not.toBeDisabled();
    expect(screen.getByText("1 Verein zusammenführen")).toBeInTheDocument();
  });
});
