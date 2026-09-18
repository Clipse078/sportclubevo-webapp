/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import SpieleManagementSchnellfilter from "@/components/admin/matchcenter/SpieleManagementSchnellfilter";

const DEFAULT_STATUS_COUNTS = {
  anstehend: 3,
  offen: 1,
  bereit: 2,
  abgesagt: 0,
};

const DEFAULT_PROPS = {
  homeAwayFilter: "ALLE" as const,
  statusMask: ["anstehend", "offen", "bereit"] as const,
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
  teamFilterLinks: [
    {
      key: "all-teams",
      label: "Alle Teams",
      href: "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
      active: true,
    },
    {
      key: "team-1",
      label: "Junioren C1",
      href: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&team=team-1",
      active: false,
    },
  ],
  competitionFilterLinks: [
    {
      key: "all-competitions",
      label: "Alle Wettbewerbe",
      href: "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
      active: true,
    },
    {
      key: "competition-Meisterschaft",
      label: "Meisterschaft",
      href: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&competition=Meisterschaft",
      active: false,
    },
  ],
  venueFilterLinks: [
    {
      key: "all-venues",
      label: "Alle Spielorte",
      href: "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
      active: true,
    },
    {
      key: "venue-Im Brüel",
      label: "Im Brüel",
      href: "/dashboard/matchcenter?tab=spielplanung&month=2026-09&venue=Im%20Br%C3%BCel",
      active: false,
    },
  ],
  zeitraumLinks: {
    monthLabel: "September 2026",
    previousHref: "/dashboard/matchcenter?tab=spielplanung&month=2026-08",
    nextHref: "/dashboard/matchcenter?tab=spielplanung&month=2026-10",
    todayHref: "/dashboard/matchcenter?tab=spielplanung&month=2026-09",
  },
};

describe("SpieleManagementSchnellfilter — disclosure sections", () => {
  it("Teams section toggles open/closed with aria-expanded", async () => {
    const user = userEvent.setup();
    render(<SpieleManagementSchnellfilter {...DEFAULT_PROPS} />);

    const trigger = screen.getByTestId("spiele-schnellfilter-teams");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("spiele-schnellfilter-teams-panel")).toBeNull();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("spiele-schnellfilter-teams-panel")).toBeInTheDocument();
    expect(screen.getByTestId("spiele-schnellfilter-link-team-1")).toHaveAttribute(
      "href",
      "/dashboard/matchcenter?tab=spielplanung&month=2026-09&team=team-1",
    );

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("Wettbewerbe and Spielorte disclosures operate independently", async () => {
    const user = userEvent.setup();
    render(<SpieleManagementSchnellfilter {...DEFAULT_PROPS} />);

    await user.click(screen.getByTestId("spiele-schnellfilter-competitions"));
    await user.click(screen.getByTestId("spiele-schnellfilter-venues"));

    expect(screen.getByTestId("spiele-schnellfilter-competitions")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("spiele-schnellfilter-venues")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("spiele-schnellfilter-teams")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("Zeitraum section exposes month navigation links", async () => {
    const user = userEvent.setup();
    render(<SpieleManagementSchnellfilter {...DEFAULT_PROPS} />);

    await user.click(screen.getByTestId("spiele-schnellfilter-zeitraum"));
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    expect(screen.getByTestId("spiele-schnellfilter-month-previous")).toHaveAttribute(
      "href",
      "/dashboard/matchcenter?tab=spielplanung&month=2026-08",
    );
    expect(screen.getByTestId("spiele-schnellfilter-month-today")).toBeInTheDocument();
  });

  it("preserves existing Status and Heim/Auswärts controls", () => {
    render(<SpieleManagementSchnellfilter {...DEFAULT_PROPS} />);

    expect(screen.getByTestId("spiele-ha-filter-home")).toBeInTheDocument();
    expect(screen.getByTestId("spiele-status-toggle-bereit")).toBeInTheDocument();
    expect(screen.getByTestId("spiele-filter-reset")).toBeInTheDocument();
  });
});
