/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SportingActivityMetaRail } from "@/components/sporting-activity/SportingActivityMetaRail";
import { SportingActivityFormIdentitySummary } from "@/components/sporting-activity/SportingActivityFormIdentitySummary";
import TrainingSeriesManagementRow from "@/components/admin/training/TrainingSeriesManagementRow";
import type { TrainingSeriesManagementRow as Row } from "@/lib/training/management-series-view";
import { buildTrainingManagementActivityPresentation } from "@/lib/sporting-activity-presentation/management-adapters";
import { splitSportingActivityTimeRangeLabel } from "@/lib/sporting-activity-presentation/time-range";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("SCE-ACTIVITY-DESIGN-01C01D-R2 — time range nowrap contract", () => {
  it("applies whitespace-nowrap on meta rail time element", () => {
    render(
      <SportingActivityMetaRail
        activityKind="TRAINING"
        typeLabel="TRAINING"
        startTimeLabel="17:00"
        endTimeLabel="18:30"
        density="compact"
      />,
    );
    const time = screen.getByTestId("sporting-activity-meta-rail-time");
    expect(time).toHaveTextContent("17:00–18:30");
    expect(time.className).toContain("whitespace-nowrap");
  });

  it("splits stored HH:mm–HH:mm labels for management rows", () => {
    expect(splitSportingActivityTimeRangeLabel("18:45–20:15")).toEqual({
      startLabel: "18:45",
      endLabel: "20:15",
    });
  });
});

describe("SCE-ACTIVITY-DESIGN-01C01D-R2 — Trainings management duplication", () => {
  const BASE_ROW: Row = {
    seriesId: "series-1",
    teamSeasonId: "ts-1",
    title: "Junioren C1 Training",
    contextLabel: "FC Allschwil",
    teamDisplayName: "Junioren C1",
    weekdays: ["TUESDAY", "THURSDAY", "FRIDAY"],
    rhythmLabel: "Di · Do · Fr",
    timeLabel: "18:45–20:15",
    timeLines: null,
    timeDetailLines: null,
    sortStartTime: "18:45",
    facilityLabel: "Kunstrasen 3 A",
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
        title: "Junioren C1 Training",
        weekdays: ["TUESDAY", "THURSDAY", "FRIDAY"],
        timeLabel: "18:45–20:15",
        timeLines: null,
        actionLabel: "Di · Do · Fr · 18:45–20:15",
        status: "ACTIVE",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ],
    activityPresentation: buildTrainingManagementActivityPresentation(
      { teamSeasonId: "ts-1", title: "Junioren C1 Training", facilityVenueName: "Kunstrasen 3" },
      "FC Allschwil",
    ),
    facilityVenueName: "Kunstrasen 3",
    facilityResourceLabel: "Kunstrasen 3 A",
    facilityLabels: ["Kunstrasen 3 A"],
  };

  it("shows canonical time once on meta rail, not in ZEIT column", () => {
    render(
      <TrainingSeriesManagementRow
        row={BASE_ROW}
        wochenplanerHref="/dashboard/planner/week"
        canManage
        canDelete={false}
      />,
    );
    expect(screen.getByTestId("sporting-activity-meta-rail-time")).toHaveTextContent(
      "18:45–20:15",
    );
    expect(screen.queryByText("18:45–20:15", { selector: "p" })).toBeNull();
    expect(screen.getByTestId("training-weekday-pills")).toBeInTheDocument();
    expect(screen.getByTestId("training-facility-cell")).toHaveTextContent("Kunstrasen 3 A");
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
  });

  it("keeps variable time label visible when meta rail cannot represent uniform range", () => {
    render(
      <TrainingSeriesManagementRow
        row={{
          ...BASE_ROW,
          timeLabel: "Unterschiedliche Zeiten",
          timeDetailLines: ["Di 18:45–20:15", "Do 19:45–21:15"],
        }}
        wochenplanerHref="/dashboard/planner/week"
        canManage
        canDelete={false}
      />,
    );
    expect(screen.getByText("Unterschiedliche Zeiten")).toBeInTheDocument();
  });
});

describe("SCE-ACTIVITY-DESIGN-01C01D-R2 — editor identity header", () => {
  it("renders schedule line on form identity summary", () => {
    render(
      <SportingActivityFormIdentitySummary
        activityKind="TRAINING"
        typeLabel="TRAINING"
        title="Junioren F3 Training"
        startTimeLabel="17:15"
        endTimeLabel="18:45"
        scheduleLine="Freitag, 02. Oktober 2026 · 17:15–18:45"
      />,
    );
    expect(screen.getByTestId("sporting-activity-form-identity-schedule")).toHaveTextContent(
      "Freitag, 02. Oktober 2026 · 17:15–18:45",
    );
  });
});
