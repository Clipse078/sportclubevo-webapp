/**
 * @vitest-environment jsdom
 */

import { NextIntlClientProvider } from "next-intl";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import deMessages from "@/messages/de.json";
import { TrainingSessionParticipantsPanel } from "@/components/admin/training/TrainingSessionParticipantsPanel";
import type { TrainingSessionParticipantDto } from "@/lib/training/training-session-participants";

function renderPanel(participants: TrainingSessionParticipantDto[]) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <TrainingSessionParticipantsPanel participants={participants} />
    </NextIntlClientProvider>,
  );
}

describe("TrainingSessionParticipantsPanel — UX-03R2", () => {
  it("renders trainers and players with participation status when present", () => {
    renderPanel([
      {
        personId: "t1",
        displayName: "Michael Duijster",
        avatarUrl: null,
        role: "TRAINER",
        trainerRoleLabel: "Trainer",
      },
      {
        personId: "p1",
        displayName: "James Example",
        avatarUrl: null,
        role: "PLAYER",
        participationStatus: "YES",
      },
      {
        personId: "p2",
        displayName: "Luca Beispiel",
        avatarUrl: null,
        role: "PLAYER",
      },
    ]);

    expect(screen.getByText("Michael Duijster")).toBeInTheDocument();
    expect(screen.getByText("James Example")).toBeInTheDocument();
    expect(screen.getByText("Dabei")).toBeInTheDocument();
    expect(screen.queryByTestId("training-session-participant-status-yes")).toBeInTheDocument();
    expect(screen.queryByTestId("training-session-participant-status-open")).not.toBeInTheDocument();
  });

  it("discloses additional players via Alle anzeigen", () => {
    const players: TrainingSessionParticipantDto[] = Array.from({ length: 14 }, (_, index) => ({
      personId: `p-${index}`,
      displayName: `Spieler ${index}`,
      avatarUrl: null,
      role: "PLAYER" as const,
    }));

    renderPanel(players);

    expect(screen.queryByText("Spieler 13")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("training-session-participants-show-all"));
    expect(screen.getByText("Spieler 13")).toBeInTheDocument();
  });

  it("P — roster is read-only (no edit controls)", () => {
    renderPanel([
      {
        personId: "p1",
        displayName: "James Example",
        avatarUrl: null,
        role: "PLAYER",
      },
    ]);

    expect(screen.queryByRole("button", { name: /bearbeiten/i })).not.toBeInTheDocument();
  });
});
