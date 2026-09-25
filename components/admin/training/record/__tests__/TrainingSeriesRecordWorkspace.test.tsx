/**
 * @vitest-environment jsdom
 *
 * TRAININGS-UX-02 — training record workspace (edit) focused tests.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrainingSeriesRecordWorkspace from "@/components/admin/training/record/TrainingSeriesRecordWorkspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const defaultProps = {
  seriesId: "series-1",
  seriesStatus: "ACTIVE" as const,
  teamSeasons: [
    {
      id: "ts-1",
      teamId: "team-1",
      teamName: "Junioren F2",
      seasonName: "Saison 2025/26",
      trainers: [{ id: "tr-1", name: "Alex Trainer", roleLabel: "Head Coach" }],
    },
  ],
  defaultValues: {
    teamSeasonId: "ts-1",
    title: "Junioren F2 Training",
    description: null,
    timezone: "Europe/Zurich",
    validFrom: "2025-08-01",
    validUntil: "2026-07-31",
    weekdaySchedules: [{ weekday: "MONDAY" as const, startsAt: "17:00", endsAt: "18:30" }],
  },
  wochenplanerHref: "/dashboard/wochenplaner?teamSeason=ts-1",
  scheduleRail: "Mo · 17:00–18:30",
  pitchLabel: "KR2",
  dressingRoomLabel: "O3",
  updatedAtIso: "2026-09-01T10:00:00.000Z",
  publication: {
    trainingWebsiteVisible: true,
    infoboardVisible: true,
    canEditTeamPublication: false,
  },
  canManage: true,
  canDelete: true,
  defaultTrainingDurationMinutes: 90,
  participationPolicy: {
    participationResponseDueDaysBefore: 1,
    participationResponseDueLocalTime: "18:00",
    participationReminder1PresetKey: "DAYS_1",
    participationReminder2PresetKey: null,
  },
};

function jsonResponse(data: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

describe("TrainingSeriesRecordWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders record header with team-based title and save action", () => {
    render(<TrainingSeriesRecordWorkspace {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Junioren F2 Training");
    expect(screen.getByTestId("training-series-submit")).toHaveTextContent("Speichern");
    expect(screen.getByTestId("training-record-back-link")).toHaveAttribute("href", "/dashboard/training");
  });

  it("shows unsaved hint and enables save when title changes", () => {
    render(<TrainingSeriesRecordWorkspace {...defaultProps} />);

    const saveButton = screen.getByTestId("training-series-submit");
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByTestId("training-series-title"), {
      target: { value: "Junioren F2 Training (Winter)" },
    });

    expect(screen.getByTestId("training-record-unsaved-hint")).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
  });

  it("submits PUT to canonical training-series API with weekday schedules", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        generation: { occurrencesInWindow: 12, created: 0, updated: 2, unchanged: 10 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<TrainingSeriesRecordWorkspace {...defaultProps} />);

    fireEvent.change(screen.getByTestId("training-series-title"), {
      target: { value: "Junioren F2 Training (Winter)" },
    });
    fireEvent.click(screen.getByTestId("training-series-submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/training-series/series-1",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("Junioren F2 Training (Winter)"),
      }),
    );
  });

  it("renders schedule section with duration for active weekday", () => {
    render(<TrainingSeriesRecordWorkspace {...defaultProps} />);
    expect(screen.getByTestId("training-record-section-schedule")).toBeInTheDocument();
    expect(screen.getByText("1 h 30 min")).toBeInTheDocument();
  });

  it("does not overwrite persisted weekday end times on load", () => {
    render(<TrainingSeriesRecordWorkspace {...defaultProps} defaultTrainingDurationMinutes={120} />);
    expect(screen.getByTestId("training-series-weekday-monday-end")).toHaveValue("18:30");
  });

  it("uses canonical duration when enabling a new weekday slot", () => {
    render(<TrainingSeriesRecordWorkspace {...defaultProps} defaultTrainingDurationMinutes={90} />);
    fireEvent.click(screen.getByRole("button", { name: "Dienstag aktivieren" }));
    expect(screen.getByTestId("training-series-weekday-tuesday-start")).toHaveValue("17:00");
    expect(screen.getByTestId("training-series-weekday-tuesday-end")).toHaveValue("18:30");
  });
});
