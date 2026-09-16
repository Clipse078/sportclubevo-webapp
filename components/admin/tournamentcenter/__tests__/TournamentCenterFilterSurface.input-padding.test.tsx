/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TournamentCenterFilterSurface } from "@/components/admin/tournamentcenter/TournamentCenterFilterSurface";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("TournamentCenterFilterSurface team search padding", () => {
  it("uses fca-search-input on the filter team search field", () => {
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

    const input = screen.getByTestId("tournamentcenter-filter-team-search");
    expect(input.className).toContain("fca-search-input");
    expect(input.className).toContain("fca-input");
  });
});
