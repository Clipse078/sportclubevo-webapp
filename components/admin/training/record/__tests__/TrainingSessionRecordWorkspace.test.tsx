/**
 * @vitest-environment jsdom
 *
 * TRAININGS-UX-03 — Training Session Record Workspace focused tests.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainingSessionRecordWorkspace from "../TrainingSessionRecordWorkspace";
import {
  TRAINING_RECORD_MAIN_RAIL_GRID,
  TRAINING_RECORD_RAIL_ASIDE,
} from "@/components/admin/training/form/training-form-layout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: { success: vi.fn(), danger: vi.fn() } }),
}));

vi.mock("@/hooks/use-facility-availability", () => ({
  useFacilityAvailability: () => ({ pitchAvailability: new Map(), dressingRoomAvailability: new Map() }),
}));

const defaultProps = {
  sessionId: "session-1",
  trainingSeriesId: "series-1",
  trainingSeriesTitle: "Juniorinnen FF-14 Training",
  teamName: "Juniorinnen FF-14",
  canManage: true,
  isRescheduled: false,
  effectiveDate: "2026-09-17",
  effectiveStartTime: "19:15",
  effectiveEndTime: "20:45",
  originalDate: "2026-09-17",
  originalStartTime: "19:15",
  originalEndTime: "20:45",
  seriesWeekday: "THURSDAY" as const,
  timezone: "Europe/Zurich",
  locale: "de-CH",
  seriesEditHref: "/dashboard/training/series/series-1/edit",
  wochenplanerHref: "/dashboard/wochenplaner?date=2026-09-17",
  dressingRoomOccupancyMode: "DEFAULT" as const,
  initialSessionAllocations: [],
  seriesAllocations: [],
  facilityGroups: [],
  sessionStartAt: "2026-09-17T17:15:00.000Z",
  sessionEndAt: "2026-09-17T18:45:00.000Z",
};

describe("TrainingSessionRecordWorkspace", () => {
  it("renders occurrence identity, parent series relationship, and navigation actions", () => {
    render(<TrainingSessionRecordWorkspace {...defaultProps} />);

    expect(screen.getByTestId("training-session-record-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("training-session-record-title")).toHaveTextContent(
      "Juniorinnen FF-14 Training",
    );
    expect(screen.getByTestId("training-session-record-context-line")).toHaveTextContent("Einzeltermin");
    expect(screen.getByText("Planung")).toBeInTheDocument();
    expect(screen.getAllByText("Trainings").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("TrainingCenter")).not.toBeInTheDocument();

    expect(screen.getByTestId("training-session-header-series-link")).toHaveAttribute(
      "href",
      "/dashboard/training/series/series-1/edit",
    );
    expect(screen.getByTestId("training-session-header-wochenplaner-link")).toBeInTheDocument();
    expect(screen.getByTestId("training-session-record-context-rail")).toBeInTheDocument();
  });

  it("represents date/time and resources sections with series-standard state", () => {
    render(<TrainingSessionRecordWorkspace {...defaultProps} />);

    expect(screen.getByTestId("training-session-record-section-termin")).toBeInTheDocument();
    expect(screen.getByTestId("training-session-record-section-resources")).toBeInTheDocument();
    expect(screen.getByTestId("training-session-edit-form")).toBeInTheDocument();
    expect(screen.getByTestId("training-session-allocation-editor")).toBeInTheDocument();
    expect(screen.getByTestId("training-session-record-override-status")).toHaveTextContent("Serienstandard");
  });

  it("shows abweichend state when occurrence is rescheduled", () => {
    render(
      <TrainingSessionRecordWorkspace
        {...defaultProps}
        isRescheduled
        effectiveStartTime="19:30"
        effectiveEndTime="21:00"
      />,
    );

    expect(screen.getByTestId("training-session-record-override-status")).toHaveTextContent(
      "Abweichend von Serie",
    );
  });

  it("uses min-[105rem] responsive rail contract shared with SCE record workspaces", () => {
    expect(TRAINING_RECORD_MAIN_RAIL_GRID).toContain("min-[105rem]");
    expect(TRAINING_RECORD_RAIL_ASIDE).toContain("min-[105rem]");
  });

  it("uses dark workspace surface without route-local white cards", () => {
    render(<TrainingSessionRecordWorkspace {...defaultProps} />);
    const surface = screen.getByTestId("training-session-record-main-surface");
    expect(surface.className).toContain("bg-[var(--surface)]");
    expect(surface.className).not.toContain("bg-white");
  });
});
