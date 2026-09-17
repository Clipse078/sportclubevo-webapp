/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlannerEntryEditForm from "@/components/admin/planner/PlannerEntryEditForm";
import type { EventSource, EventType } from "@prisma/client";

vi.mock("@/app/(admin)/dashboard/planner/actions", () => ({
  updatePlannerEntryAction: vi.fn(),
}));

vi.mock("@/components/admin/planner/PlannerEntryDeleteButton", () => ({
  default: () => <button type="button">Löschen</button>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const BASE_DATA = {
  seasons: [{ id: "s1", key: "2025-26", name: "Saison 2025/26", isActive: true }],
  teams: [{ id: "t1", name: "Junioren D-9", category: "Junioren" }],
  selectedSeasonKey: "2025-26",
  selectedSeasonId: "s1",
  selectedType: "MATCH" as EventType,
  backHref: "/dashboard/planner",
  eventId: "evt-match-1",
  teamName: "Junioren D-9",
  seasonName: "Saison 2025/26",
  defaults: {
    title: "Junioren D-9 vs FC Ettingen",
    source: "MANUAL" as EventSource,
    teamId: "t1",
    location: "Hauptplatz",
    startAt: "2026-09-19T07:30",
    endAt: "",
    operationalEndAtOverride: "",
    opponentName: "FC Ettingen",
    organizerName: "",
    competitionLabel: "Meisterschaft",
    description: "",
    remarks: "",
    websiteVisible: true,
    infoboardVisible: true,
    homepageVisible: false,
    wochenplanVisible: false,
    trainingsplanVisible: false,
    teamPageVisible: false,
  },
  matchOperationalInterval: null,
};

describe("PlannerEntryEditForm", () => {
  it("renders premium dark edit shell without legacy Eintragstyp selector", () => {
    render(<PlannerEntryEditForm data={BASE_DATA} canManage />);
    expect(screen.getByTestId("planner-entry-edit")).toBeInTheDocument();
    expect(screen.queryByText("Eintragstyp")).not.toBeInTheDocument();
    expect(screen.queryByText("Planner-Eintrag bearbeiten")).not.toBeInTheDocument();
    expect(screen.getByText("Spiel bearbeiten")).toBeInTheDocument();
  });

  it("uses role=switch for publication controls, not checkboxes", () => {
    render(<PlannerEntryEditForm data={BASE_DATA} canManage />);
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("does not expose homepage, trainingsplan, or team page for MATCH", () => {
    render(<PlannerEntryEditForm data={BASE_DATA} canManage />);
    expect(screen.queryByText("Homepage")).not.toBeInTheDocument();
    expect(screen.queryByText("Trainingsplan")).not.toBeInTheDocument();
    expect(screen.queryByText("Teamseite")).not.toBeInTheDocument();
  });

  it("does not warn on missing manual end when policy can derive the interval", () => {
    render(<PlannerEntryEditForm data={BASE_DATA} canManage />);
    expect(
      screen.queryByTestId("planner-match-end-time-warning"),
    ).not.toBeInTheDocument();
  });

  it("clears end-time warning when meaningful end is entered", () => {
    render(<PlannerEntryEditForm data={BASE_DATA} canManage />);
    fireEvent.change(screen.getByTestId("planner-edit-end-at"), {
      target: { value: "2026-09-19T09:00" },
    });
    expect(
      screen.queryByTestId("planner-match-end-time-warning"),
    ).not.toBeInTheDocument();
  });

  it("does not false-positive overnight match when end is after start on next day", () => {
    const overnight = {
      ...BASE_DATA,
      defaults: {
        ...BASE_DATA.defaults,
        startAt: "2026-09-19T22:00",
        endAt: "2026-09-20T00:30",
      },
    };
    render(<PlannerEntryEditForm data={overnight} canManage />);
    expect(
      screen.queryByTestId("planner-match-end-time-warning"),
    ).not.toBeInTheDocument();
  });

  it("does not warn when manual start equals end (operational policy applies separately)", () => {
    const sameEnd = {
      ...BASE_DATA,
      defaults: {
        ...BASE_DATA.defaults,
        endAt: "2026-09-19T07:30",
      },
    };
    render(<PlannerEntryEditForm data={sameEnd} canManage />);
    expect(
      screen.queryByTestId("planner-match-end-time-warning"),
    ).not.toBeInTheDocument();
  });

  it("hides save controls for read-only RBAC", () => {
    render(<PlannerEntryEditForm data={BASE_DATA} canManage={false} />);
    expect(screen.queryByTestId("planner-edit-save-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("planner-edit-save-footer")).not.toBeInTheDocument();
  });

  it("persists publication toggles via hidden on inputs in form", () => {
    render(<PlannerEntryEditForm data={BASE_DATA} canManage />);
    expect(
      screen.getByTestId("planner-publication-hidden-websiteVisible"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("planner-publication-hidden-infoboardVisible"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("switch")[2]);
    expect(
      screen.queryByTestId("planner-publication-hidden-infoboardVisible"),
    ).not.toBeInTheDocument();
  });
});
