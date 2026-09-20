/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ParticipationRequestConfigEditor } from "../ParticipationRequestConfigEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ParticipationRequestConfigEditor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders deadline fields and submits PATCH on change", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    render(
      <ParticipationRequestConfigEditor
        apiPath="/api/matchcenter/m1/participation-request"
        timeZone="Europe/Zurich"
        values={{
          participationResponseDueAt: "2026-09-25T16:00:00.000Z",
          participationReminder1At: null,
          participationReminder2At: null,
          participationReminder1PresetKey: "DAYS_1",
          participationReminder2PresetKey: null,
        }}
      />,
    );

    expect(screen.getByTestId("participation-request-deadline-fields")).toBeTruthy();
    fireEvent.change(screen.getByTestId("task-reminder1-preset"), {
      target: { value: "DAYS_2" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/matchcenter/m1/participation-request",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });
});
