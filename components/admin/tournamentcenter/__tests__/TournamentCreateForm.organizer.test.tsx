/**
 * @vitest-environment jsdom
 *
 * TURNIERE-UX-02A — create flow shares Veranstalter Verein picker with edit.
 */

import "./tournament-create-form-composer-mock";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentCreateForm from "../TournamentCreateForm";
import { TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS } from "./tournament-form-test-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/create",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/club-directory/clubs")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ clubs: [], meta: { total: 0, limit: 200, skip: 0, hasMore: false } }),
        } as Response;
      }
      if (url.startsWith("/api/facilities/availability")) {
        return { ok: true, status: 200, json: async () => ({ availability: [] }) } as Response;
      }
      throw new Error(url);
    }),
  );
});

describe("TournamentCreateForm — Veranstalter picker (TURNIERE-UX-02A)", () => {
  it("uses the same searchable Verein picker (no free-text Organisator field)", async () => {
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("tournament-create-organizer-club")).toBeInTheDocument());
    expect(screen.queryByPlaceholderText("z. B. FC Aesch")).not.toBeInTheDocument();
  });
});
