/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TrainingSeriesRowContextMenu from "@/components/admin/training/TrainingSeriesRowContextMenu";
import type { TrainingSeriesManagementSeriesEntry } from "@/lib/training/management-series-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const SINGLE_ENTRIES: TrainingSeriesManagementSeriesEntry[] = [
  {
    seriesId: "series-1",
    title: "1. Mannschaft Training",
    weekdays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
    timeLabel: "18:45–20:15",
    timeLines: null,
    actionLabel: "Montag, Mittwoch, Freitag · 18:45–20:15",
    status: "ACTIVE",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
];

const MULTI_ENTRIES: TrainingSeriesManagementSeriesEntry[] = [
  {
    seriesId: "series-1",
    title: "1. Mannschaft Training",
    weekdays: ["MONDAY"],
    timeLabel: "18:45–20:15",
    timeLines: null,
    actionLabel: "Montag · 18:45–20:15",
    status: "ACTIVE",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    seriesId: "series-2",
    title: "1. Mannschaft Training",
    weekdays: ["WEDNESDAY"],
    timeLabel: "18:45–20:15",
    timeLines: null,
    actionLabel: "Mittwoch · 18:45–20:15",
    status: "ACTIVE",
    updatedAt: "2026-02-02T00:00:00.000Z",
  },
  {
    seriesId: "series-3",
    title: "1. Mannschaft Training",
    weekdays: ["FRIDAY"],
    timeLabel: "18:45–20:15",
    timeLines: null,
    actionLabel: "Freitag · 18:45–20:15",
    status: "ACTIVE",
    updatedAt: "2026-02-03T00:00:00.000Z",
  },
];

function renderMenu(entries: TrainingSeriesManagementSeriesEntry[], overrides?: Partial<Parameters<typeof TrainingSeriesRowContextMenu>[0]>) {
  return render(
    <TrainingSeriesRowContextMenu
      teamSeasonId="ts-1"
      teamLabel="1. Mannschaft"
      wochenplanerHref="/dashboard/planner/week?team=ts-1"
      seriesEntries={entries}
      canManage
      canDelete
      {...overrides}
    />,
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("training-team-menu-ts-1"));
  return screen.getByRole("menu", { name: "Aktionen für 1. Mannschaft" });
}

describe("TRAININGS-UX-01J3 TrainingSeriesRowContextMenu", () => {
  it("renders exactly one ellipsis trigger per team row", () => {
    renderMenu(MULTI_ENTRIES);
    expect(screen.getAllByLabelText(/Trainingsaktionen für 1\. Mannschaft/)).toHaveLength(1);
    expect(screen.getByTestId("training-team-menu-ts-1")).toBeInTheDocument();
  });

  it("single series: one top-level action per concept with canonical hrefs", async () => {
    const user = userEvent.setup();
    renderMenu(SINGLE_ENTRIES);
    const menu = await openMenu(user);

    expect(within(menu).getAllByRole("menuitem", { name: "Serie bearbeiten" })).toHaveLength(1);
    expect(within(menu).getAllByRole("menuitem", { name: "Ressourcen verwalten" })).toHaveLength(1);
    expect(within(menu).getAllByRole("menuitem", { name: "Im Wochenplaner anzeigen" })).toHaveLength(1);
    expect(within(menu).getAllByRole("menuitem", { name: "Archivieren" })).toHaveLength(1);
    expect(within(menu).getAllByRole("menuitem", { name: "Löschen" })).toHaveLength(1);

    expect(screen.getByRole("menuitem", { name: "Serie bearbeiten" })).toHaveAttribute(
      "href",
      "/dashboard/training/series/series-1/edit",
    );
    expect(screen.getByRole("menuitem", { name: "Ressourcen verwalten" })).toHaveAttribute(
      "href",
      "/dashboard/training/series/series-1/edit#training-series-ressourcen",
    );
    expect(screen.getByRole("menuitem", { name: "Im Wochenplaner anzeigen" })).toHaveAttribute(
      "href",
      "/dashboard/planner/week?team=ts-1",
    );
  });

  it("multiple series: top-level labels appear once and open series chooser drill-down", async () => {
    const user = userEvent.setup();
    renderMenu(MULTI_ENTRIES);
    const menu = await openMenu(user);

    expect(within(menu).getAllByRole("menuitem", { name: "Serie bearbeiten" })).toHaveLength(1);
    expect(within(menu).getAllByRole("menuitem", { name: "Ressourcen verwalten" })).toHaveLength(1);
    expect(within(menu).getAllByRole("menuitem", { name: "Archivieren" })).toHaveLength(1);
    expect(within(menu).getAllByRole("menuitem", { name: "Löschen" })).toHaveLength(1);

    await user.click(within(menu).getByRole("menuitem", { name: "Serie bearbeiten" }));

    const chooser = screen.getByRole("group", { name: "Serie bearbeiten — Serie wählen" });
    expect(within(chooser).getByRole("menuitem", { name: "Montag · 18:45–20:15" })).toHaveAttribute(
      "href",
      "/dashboard/training/series/series-1/edit",
    );
    expect(within(chooser).getByRole("menuitem", { name: "Mittwoch · 18:45–20:15" })).toHaveAttribute(
      "href",
      "/dashboard/training/series/series-2/edit",
    );
  });

  it("uses soccer-pitch facility icon styling for Ressourcen verwalten", async () => {
    const user = userEvent.setup();
    renderMenu(SINGLE_ENTRIES);
    await openMenu(user);
    expect(document.querySelector('[role="menuitem"][href*="training-series-ressourcen"] svg')).toBeTruthy();
  });

  it("does not render nested per-series ellipsis triggers", async () => {
    const user = userEvent.setup();
    renderMenu(MULTI_ENTRIES);
    await openMenu(user);
    expect(screen.queryAllByTestId(/training-team-menu-/)).toHaveLength(1);
    expect(screen.queryAllByTestId(/training-series-menu-/)).toHaveLength(0);
  });
});

describe("TRAININGS-UX-01J3 row integration", () => {
  it("management row exposes one team menu trigger", async () => {
    const { default: TrainingSeriesManagementRow } = await import(
      "@/components/admin/training/TrainingSeriesManagementRow"
    );
    render(
      <TrainingSeriesManagementRow
        row={{
          seriesId: "series-1",
          teamSeasonId: "ts-1",
          title: "1. Mannschaft Training",
          contextLabel: "FC Allschwil · 1. Mannschaft",
          teamDisplayName: "1. Mannschaft",
          weekdays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
          rhythmLabel: "Mo · Mi · Fr",
          timeLabel: "18:45–20:15",
          timeLines: null,
          timeDetailLines: null,
          sortStartTime: "18:45",
          facilityLabel: "Kunstrasen 2 A",
          facilityExtraCount: 0,
          status: "ACTIVE",
          planningStage: "APPROVED",
          validFrom: null,
          validUntil: null,
          sessionCount: 12,
          updatedAt: "2026-02-01T00:00:00.000Z",
          seriesEntries: MULTI_ENTRIES,
        }}
        wochenplanerHref="/dashboard/planner/week"
        canManage
        canDelete
      />,
    );

    expect(screen.getAllByTestId("training-team-menu-ts-1")).toHaveLength(1);
  });
});
