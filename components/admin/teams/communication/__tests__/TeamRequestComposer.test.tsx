// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TeamRequestComposer } from "@/components/admin/teams/communication/TeamRequestComposer";

describe("TeamRequestComposer", () => {
  it("supports simple single-slot request", async () => {
    const onSend = vi.fn().mockResolvedValue({ ok: true });
    const onSent = vi.fn();

    render(
      <TeamRequestComposer teamId="team-1" onSend={onSend} onSent={onSent} />,
    );

    fireEvent.change(screen.getByTestId("team-request-title-input"), {
      target: { value: "Leibchen waschen" },
    });
    fireEvent.change(screen.getByTestId("team-request-slot-label-0"), {
      target: { value: "Waschtag" },
    });
    fireEvent.change(screen.getByTestId("team-request-slot-capacity-0"), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByTestId("team-request-send-button"));

    await vi.waitFor(() => expect(onSend).toHaveBeenCalled());
    const payload = onSend.mock.calls[0]![0];
    expect(payload.slots).toHaveLength(1);
    expect(payload.slots[0]?.requiredCapacity).toBe(1);
  });

  it("allows adding multiple slots", () => {
    render(
      <TeamRequestComposer
        teamId="team-1"
        onSend={vi.fn().mockResolvedValue({ ok: true })}
        onSent={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("team-request-add-slot"));
    expect(screen.getByTestId("team-request-slot-row-1")).toBeInTheDocument();
  });
});
