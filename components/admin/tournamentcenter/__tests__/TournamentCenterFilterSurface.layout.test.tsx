/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  TOURNAMENT_FILTER_PANEL_WIDTH_CLASS,
  TournamentCenterFilterSurface,
} from "@/components/admin/tournamentcenter/TournamentCenterFilterSurface";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("TournamentCenterFilterSurface layout", () => {
  it("uses viewport-safe filter panel width (not legacy 22rem cap)", () => {
    expect(TOURNAMENT_FILTER_PANEL_WIDTH_CLASS).toContain("26.25rem");
    expect(TOURNAMENT_FILTER_PANEL_WIDTH_CLASS).toContain("calc(100vw-2rem)");
    expect(TOURNAMENT_FILTER_PANEL_WIDTH_CLASS).not.toContain("22rem");
  });

  it("chip groups use flex-wrap for month and status filters", () => {
    render(
      <TournamentCenterFilterSurface
        scope="UPCOMING"
        teamFilter={null}
        monthParam={null}
        statusFilter={null}
        actionFilter="ALLE"
        group="DATE"
        sort="DATE_ASC"
        teamOptions={[]}
        locale="de-CH"
        timezone="Europe/Zurich"
        buildHref={() => "/dashboard/tournamentcenter"}
        filtersActive={false}
      />,
    );

    fireEvent.click(screen.getByTestId("tournamentcenter-filter-trigger"));

    expect(screen.getByTestId("tournamentcenter-filter-month-chips").className).toContain("flex-wrap");
    expect(screen.getByTestId("tournamentcenter-filter-status-chips").className).toContain("flex-wrap");
    expect(screen.getByTestId("tournamentcenter-filter-readiness-chips").className).toContain("flex-wrap");
  });

  it("does not apply overflow-x-hidden on the filter panel content contract", () => {
    render(
      <TournamentCenterFilterSurface
        scope="UPCOMING"
        teamFilter={null}
        monthParam={null}
        statusFilter={null}
        actionFilter="ALLE"
        group="DATE"
        sort="DATE_ASC"
        teamOptions={[]}
        locale="de-CH"
        timezone="Europe/Zurich"
        buildHref={() => "/dashboard/tournamentcenter"}
        filtersActive={false}
      />,
    );

    fireEvent.click(screen.getByTestId("tournamentcenter-filter-trigger"));
    const panel = screen.getByTestId("tournamentcenter-filter-panel");
    expect(panel.className).not.toContain("overflow-x-hidden");
  });
});
