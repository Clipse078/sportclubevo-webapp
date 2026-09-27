// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TeamFormalCommunicationComposer } from "@/components/admin/teams/communication/TeamFormalCommunicationComposer";

describe("TeamFormalCommunicationComposer", () => {
  it("renders announcement composer with audience and ack toggle", () => {
    render(
      <TeamFormalCommunicationComposer
        teamId="team-1"
        mode="ANNOUNCEMENT"
        onSent={vi.fn()}
        onSend={vi.fn(async () => ({ ok: true }))}
      />,
    );

    expect(screen.getByTestId("team-formal-composer-announcement")).toBeInTheDocument();
    expect(screen.getByTestId("team-formal-audience-select")).toBeInTheDocument();
    expect(screen.getByTestId("team-formal-ack-toggle")).toBeInTheDocument();
  });

  it("submits alert with title and body", async () => {
    const onSend = vi.fn(async () => ({ ok: true }));
    const onSent = vi.fn();
    render(
      <TeamFormalCommunicationComposer
        teamId="team-1"
        mode="ALERT"
        onSent={onSent}
        onSend={onSend}
      />,
    );

    fireEvent.change(screen.getByTestId("team-formal-subject-input"), {
      target: { value: "Training abgesagt" },
    });
    fireEvent.change(screen.getByTestId("team-formal-body-input"), {
      target: { value: "Wetter." },
    });
    fireEvent.click(screen.getByTestId("team-formal-send-button"));

    await vi.waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Training abgesagt",
          bodyText: "Wetter.",
          acknowledgementRequired: true,
        }),
      );
    });
  });
});
