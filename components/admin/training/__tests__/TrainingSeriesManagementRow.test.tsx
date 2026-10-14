/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrainingSeriesManagementRow from "@/components/admin/training/TrainingSeriesManagementRow";
import type { TrainingSeriesManagementRow as Row } from "@/lib/training/management-series-view";
import { buildTrainingManagementActivityPresentation } from "@/lib/sporting-activity-presentation/management-adapters";
import { resolveSceTrainingPresentationFromManagementRow } from "@/lib/sporting-activity-presentation/canonical/adapters/training-management";

const BASE_ROW: Row = {
  seriesId: "series-1",
  teamSeasonId: "ts-1",
  title: "Junioren F2 Training",
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
  seriesEntries: [
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
  ],
  activityPresentation: buildTrainingManagementActivityPresentation(
    {
      teamSeasonId: "ts-1",
      title: "Junioren F2 Training",
      facilityVenueName: "Kunstrasen 2",
    },
    "FC Allschwil",
  ),
  sceTrainingPresentation: resolveSceTrainingPresentationFromManagementRow(
    {
      teamSeasonId: "ts-1",
      title: "Junioren F2 Training",
      teamDisplayName: "1. Mannschaft",
      weekdays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
      rhythmLabel: "Mo · Mi · Fr",
      timeLabel: "18:45–20:15",
      timeDetailLines: null,
      facilityVenueName: "Kunstrasen 2",
      facilityResourceLabel: "Kunstrasen 2 A",
      status: "ACTIVE",
    },
    "FC Allschwil",
  ),
  facilityVenueName: "Kunstrasen 2",
  facilityResourceLabel: "Kunstrasen 2 A",
  facilityLabels: ["Kunstrasen 2 A"],
};

describe("TrainingSeriesManagementRow", () => {
  it("renders identity, weekday pills, pitch facility cell, and status badge", () => {
    render(
      <TrainingSeriesManagementRow
        row={BASE_ROW}
        wochenplanerHref="/dashboard/planner/week"
        canManage
        canDelete={false}
      />,
    );

    expect(screen.getByTestId("training-management-sce-card")).toBeInTheDocument();
    expect(screen.getByTestId("sce-training-title")).toHaveTextContent("Junioren F2 Training");
    expect(screen.queryByTestId("sce-training-compact-time")).toBeNull();
    expect(screen.getByTestId("training-series-row-time")).toHaveTextContent("18:45–20:15");
    expect(screen.queryByTestId("sce-training-compact-weekdays")).toBeNull();
    expect(screen.queryByTestId("sce-training-context-line")).toBeNull();
    expect(screen.getByTestId("sce-training-team")).toHaveTextContent("1. Mannschaft");
    expect(screen.queryByTestId("sporting-activity-meta-rail-time")).toBeNull();
    expect(screen.getByTestId("training-weekday-pills")).toHaveTextContent("Mo");
    expect(screen.getByTestId("training-weekday-pills")).toHaveTextContent("Fr");
    expect(screen.getByLabelText("Montag")).toBeInTheDocument();
    expect(screen.getByLabelText("Freitag")).toBeInTheDocument();
    expect(screen.getByTestId("training-facility-cell")).toHaveTextContent("Kunstrasen 2 A");
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.queryByText("APPROVED")).not.toBeInTheDocument();
    expect(screen.getByTestId("training-series-edit-series-1")).toHaveAttribute(
      "href",
      "/dashboard/training/series/series-1/edit",
    );
  });

  it("shows missing facility state and compact variable time label", () => {
    const timeDetailLines = ["Mo 18:45–20:15", "Mi 19:45–21:15"];
    render(
      <TrainingSeriesManagementRow
        row={{
          ...BASE_ROW,
          facilityLabel: null,
          facilityVenueName: null,
          facilityResourceLabel: null,
          activityPresentation: buildTrainingManagementActivityPresentation(
            {
              teamSeasonId: "ts-1",
              title: "Junioren F2 Training",
              facilityVenueName: null,
            },
            "FC Allschwil",
          ),
          timeLabel: "Unterschiedliche Zeiten",
          timeDetailLines,
          sceTrainingPresentation: resolveSceTrainingPresentationFromManagementRow(
            {
              teamSeasonId: "ts-1",
              title: "Junioren F2 Training",
              teamDisplayName: "1. Mannschaft",
              weekdays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
              rhythmLabel: "Mo · Mi · Fr",
              timeLabel: "Unterschiedliche Zeiten",
              timeDetailLines,
              facilityVenueName: null,
              facilityResourceLabel: null,
              status: "ACTIVE",
            },
            "FC Allschwil",
          ),
        }}
        wochenplanerHref="/dashboard/planner/week"
        canManage
        canDelete={false}
      />,
    );

    expect(screen.getByText("Nicht zugewiesen")).toBeInTheDocument();
    expect(screen.getAllByText("Unterschiedliche Zeiten")).toHaveLength(1);
    expect(screen.queryByTestId("sce-training-compact-weekdays")).toBeNull();
    expect(screen.queryByTestId("sce-training-compact-time")).toBeNull();
    expect(screen.queryByText("Mo · Mi · Fr")).not.toBeInTheDocument();
    expect(screen.queryByText("Mo 18:45–20:15")).not.toBeInTheDocument();
    const zeitCell = screen.getByTestId("training-series-row-time");
    expect(zeitCell).toHaveTextContent("Unterschiedliche Zeiten");
    expect(zeitCell.querySelector("p")).toHaveAttribute(
      "title",
      "Mo 18:45–20:15 · Mi 19:45–21:15",
    );
    expect(zeitCell.querySelector("p")).toHaveAttribute(
      "aria-label",
      "Unterschiedliche Zeiten: Mo 18:45–20:15 · Mi 19:45–21:15",
    );
  });
});
