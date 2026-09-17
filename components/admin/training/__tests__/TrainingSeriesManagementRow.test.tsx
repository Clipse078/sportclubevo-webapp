/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrainingSeriesManagementRow from "@/components/admin/training/TrainingSeriesManagementRow";
import type { TrainingSeriesManagementRow as Row } from "@/lib/training/management-series-view";

const BASE_ROW: Row = {
  seriesId: "series-1",
  teamSeasonId: "ts-1",
  title: "1. Mannschaft Training",
  teamDisplayName: "FC Allschwil · 1. Mannschaft",
  weekdays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
  rhythmLabel: "Mo · Mi · Fr",
  timeLabel: "18:45–20:15",
  timeLines: null,
  sortStartTime: "18:45",
  facilityLabel: "Kunstrasen 2 A",
  facilityExtraCount: 0,
  status: "ACTIVE",
  planningStage: "APPROVED",
  validFrom: null,
  validUntil: null,
  sessionCount: 12,
  updatedAt: "2026-02-01T00:00:00.000Z",
};

describe("TrainingSeriesManagementRow", () => {
  it("renders identity, weekday pills, green facility cell, and compact status", () => {
    render(
      <TrainingSeriesManagementRow
        row={BASE_ROW}
        wochenplanerHref="/dashboard/planner/week"
        canManage
        canDelete={false}
      />,
    );

    expect(screen.getByText("1. Mannschaft Training")).toBeInTheDocument();
    expect(screen.getByText("FC Allschwil · 1. Mannschaft")).toBeInTheDocument();
    expect(screen.getByTestId("training-weekday-pills")).toHaveTextContent("Mo");
    expect(screen.getByTestId("training-weekday-pills")).toHaveTextContent("Fr");
    expect(screen.getByTestId("training-facility-cell")).toHaveTextContent("Kunstrasen 2 A");
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.queryByText("APPROVED")).not.toBeInTheDocument();
    expect(screen.getByTestId("training-series-edit-series-1")).toHaveAttribute(
      "href",
      "/dashboard/training/series/series-1/edit",
    );
  });

  it("shows missing facility state and variable times honestly", () => {
    render(
      <TrainingSeriesManagementRow
        row={{
          ...BASE_ROW,
          facilityLabel: null,
          timeLabel: "Unterschiedliche Zeiten",
          timeLines: ["Mo 18:45–20:15", "Mi 19:45–21:15"],
        }}
        wochenplanerHref="/dashboard/planner/week"
        canManage
        canDelete={false}
      />,
    );

    expect(screen.getByText("Nicht zugewiesen")).toBeInTheDocument();
    expect(screen.getByText("Mo 18:45–20:15")).toBeInTheDocument();
    expect(screen.getByText("Mi 19:45–21:15")).toBeInTheDocument();
  });
});
