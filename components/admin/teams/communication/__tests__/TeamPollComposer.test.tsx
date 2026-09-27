// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamPollComposer } from "@/components/admin/teams/communication/TeamPollComposer";

describe("TeamPollComposer", () => {
  it("renders poll composer with type selector fields", () => {
    render(
      <TeamPollComposer
        teamId="team-1"
        mode="POLL"
        onSent={() => undefined}
        onSend={vi.fn(async () => ({ ok: true }))}
      />,
    );
    expect(screen.getByTestId("team-poll-composer-poll")).toBeInTheDocument();
    expect(screen.getByTestId("team-poll-question-input")).toBeInTheDocument();
    expect(screen.getByTestId("team-poll-mode-select")).toBeInTheDocument();
  });

  it("renders date poll datetime inputs", () => {
    render(
      <TeamPollComposer
        teamId="team-1"
        mode="DATE_POLL"
        onSent={() => undefined}
        onSend={vi.fn(async () => ({ ok: true }))}
      />,
    );
    expect(screen.getByTestId("team-poll-composer-date_poll")).toBeInTheDocument();
    expect(screen.getByTestId("team-date-poll-start-0")).toBeInTheDocument();
  });

  it("disables send until question and two options provided", () => {
    render(
      <TeamPollComposer
        teamId="team-1"
        mode="POLL"
        onSent={() => undefined}
        onSend={vi.fn(async () => ({ ok: true }))}
      />,
    );
    expect(screen.getByTestId("team-poll-send-button")).toBeDisabled();
    fireEvent.change(screen.getByTestId("team-poll-question-input"), {
      target: { value: "Shirt?" },
    });
    fireEvent.change(screen.getByTestId("team-poll-option-0"), { target: { value: "Yes" } });
    fireEvent.change(screen.getByTestId("team-poll-option-1"), { target: { value: "No" } });
    expect(screen.getByTestId("team-poll-send-button")).not.toBeDisabled();
  });
});
