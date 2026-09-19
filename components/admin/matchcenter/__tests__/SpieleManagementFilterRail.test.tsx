/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpieleManagementFilterRail from "../SpieleManagementFilterRail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const DEFAULT_STATUS_COUNTS = {
  anstehend: 3,
  offen: 1,
  bereit: 2,
  abgesagt: 0,
};

const DEFAULT_PROPS = {
  tab: "SPIELPLANUNG" as const,
  basePath: "/dashboard/matchcenter",
  month: "2026-09",
  actionFilter: "ALLE" as const,
  wochenplanFilter: "ALLE" as const,
  searchValue: "",
  sortValue: null,
  homeAwayFilter: "ALLE" as const,
  listView: "LISTE" as const,
  teamFilter: null,
  teamOptions: [
    { id: "team-1", label: "Junioren C1" },
    { id: "team-2", label: "Frauen 1" },
  ],
  teamHrefByValue: {
    "": "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
    "team-1": "/dashboard/matchcenter?tab=spielplanung&month=2026-09&team=team-1",
    "team-2": "/dashboard/matchcenter?tab=spielplanung&month=2026-09&team=team-2",
  },
  competitionFilter: null,
  venueFilter: null,
  statusMask: ["anstehend", "offen", "bereit"] as const,
  competitionOptions: ["Meisterschaft"],
  venueOptions: ["Im Brüel"],
  statusCounts: DEFAULT_STATUS_COUNTS,
  alleHref: "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
  heimHref: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&ha=heim",
  auswaertsHref: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&ha=auswaerts",
  statusToggleHrefs: {
    anstehend: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&status=offen,bereit",
    offen: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&status=anstehend,bereit",
    bereit: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&status=anstehend,offen",
    abgesagt: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&status=anstehend,offen,bereit,abgesagt",
  },
  resetHref: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&filter=alle",
  actionFilterHrefs: {
    ALLE: "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
    OFFEN: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&filter=offen",
    ERLEDIGT: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&filter=erledigt",
  },
  competitionHrefByValue: {
    "": "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
    Meisterschaft: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&competition=Meisterschaft",
  },
  venueHrefByValue: {
    "": "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
    "Im Brüel": "/dashboard/matchcenter?tab=spielplanung&month=2026-09&venue=Im%20Br%C3%BCel",
  },
};

describe("SpieleManagementFilterRail", () => {
  it("renders structured filter groups and reset link", () => {
    render(<SpieleManagementFilterRail {...DEFAULT_PROPS} />);

    expect(screen.getByTestId("spiele-filter-rail")).toBeInTheDocument();
    expect(screen.getByTestId("spiele-filter-reset")).toHaveAttribute(
      "href",
      DEFAULT_PROPS.resetHref,
    );
    expect(screen.getByTestId("spiele-competition-filter")).toBeInTheDocument();
    expect(screen.getByTestId("spiele-venue-filter")).toBeInTheDocument();
    expect(screen.getByTestId("matchcenter-team-filter-trigger")).toHaveTextContent("Alle Teams");
  });

  it("toggles home/away quick filter links", async () => {
    const user = userEvent.setup();
    render(<SpieleManagementFilterRail {...DEFAULT_PROPS} />);

    await user.click(screen.getByTestId("spiele-ha-filter-home"));
    expect(screen.getByTestId("spiele-ha-filter-home")).toHaveAttribute(
      "href",
      DEFAULT_PROPS.heimHref,
    );
  });
});
