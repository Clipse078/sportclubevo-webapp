/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PersonalActionParticipationInline from "../PersonalActionParticipationInline";

const mockRefresh = vi.fn();
const mockRespond = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/app/(admin)/dashboard/aufgaben/personal-participation-actions", () => ({
  respondToPersonalParticipationAction: (...args: unknown[]) => mockRespond(...args),
}));

const participation = {
  personalActionId: "participation:child-1:TRAINING:sess-1",
  personId: "child-1",
  subjectDisplayName: "James",
  teamSeasonId: "ts-1",
  eventKind: "TRAINING" as const,
  trainingSessionId: "sess-1",
};

describe("AUFGABEN-05-PARTICIPATION — inline controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespond.mockResolvedValue({ ok: true });
  });

  it("renders Dabei / Nicht dabei with accessible names", () => {
    render(<PersonalActionParticipationInline participation={participation} />);
    expect(screen.getByLabelText("Dabei für James")).toBeInTheDocument();
    expect(screen.getByLabelText("Nicht dabei für James")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Unsicher/i)).not.toBeInTheDocument();
  });

  it("submits YES and refreshes on success", async () => {
    render(<PersonalActionParticipationInline participation={participation} />);
    fireEvent.click(screen.getByTestId("personal-participation-yes"));

    await waitFor(() => {
      expect(mockRespond).toHaveBeenCalledWith(
        expect.objectContaining({ status: "YES", personId: "child-1" }),
      );
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("ignores double click while pending", async () => {
    let resolveRespond: (value: { ok: true }) => void = () => {};
    mockRespond.mockImplementation(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveRespond = resolve;
        }),
    );
    render(<PersonalActionParticipationInline participation={participation} />);
    fireEvent.click(screen.getByTestId("personal-participation-yes"));
    fireEvent.click(screen.getByTestId("personal-participation-yes"));
    expect(mockRespond).toHaveBeenCalledTimes(1);
    resolveRespond({ ok: true });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("shows error and restores controls on failure", async () => {
    mockRespond.mockResolvedValue({ ok: false, message: "Fehler beim Speichern." });
    render(<PersonalActionParticipationInline participation={participation} />);
    fireEvent.click(screen.getByTestId("personal-participation-no"));

    await waitFor(() => {
      expect(screen.getByTestId("personal-participation-error")).toHaveTextContent(
        "Fehler beim Speichern.",
      );
    });
    expect(screen.getByTestId("personal-participation-yes")).not.toBeDisabled();
  });
});
