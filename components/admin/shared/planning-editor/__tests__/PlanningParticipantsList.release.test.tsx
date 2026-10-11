/**
 * @vitest-environment jsdom
 */

import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import PlanningParticipantsList from "@/components/admin/shared/planning-editor/PlanningParticipantsList";

vi.mock("@/components/admin/teams/ActivityPlayerReleaseButton", () => ({
  default: ({ testId }: { testId?: string }) => (
    <button type="button" data-testid={testId}>
      Freigeben
    </button>
  ),
}));

function renderList() {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <PlanningParticipantsList
        people={[
          {
            id: "p1",
            displayName: "SCE Testspieler 02",
            role: "PLAYER",
            participationStatusLabel: "Dabei",
          },
        ]}
        releaseContext={{
          teamId: "team-b1",
          teamSeasonId: "ts-b1",
          canManageRelease: true,
          activity: {
            kind: "EVENT",
            eventId: "tournament-1",
            scopeLabel: "Turnier · Test Cup",
          },
        }}
      />
    </NextIntlClientProvider>,
  );
}

describe("PlanningParticipantsList — activity Spielerfreigabe", () => {
  it("renders Freigeben on player rows when release context is provided", () => {
    renderList();
    expect(screen.getByTestId("planning-participant-release-p1")).toBeInTheDocument();
  });
});
