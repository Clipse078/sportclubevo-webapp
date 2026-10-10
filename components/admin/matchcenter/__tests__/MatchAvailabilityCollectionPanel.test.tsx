/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
import MatchAvailabilityCollectionPanel from "../MatchAvailabilityCollectionPanel";
import type { MatchAvailabilityCollectionMetaView } from "@/lib/match-squad/types";

function meta(overrides: Partial<MatchAvailabilityCollectionMetaView> = {}): MatchAvailabilityCollectionMetaView {
  return {
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
    requestActive: false,
    readOnlyReason: null,
    canConfigureRequest: true,
    canSendReminder: false,
    reminderCandidateId: "c1",
    outstandingPlayerCount: 0,
    reminderDeliveryTargetCount: null,
    ...overrides,
  };
}

describe("MatchAvailabilityCollectionPanel", () => {
  it("shows compact no-request state without inline deadline fields", () => {
    render(
      <MatchAvailabilityCollectionPanel
        matchId="m1"
        timeZone="Europe/Zurich"
        meta={meta()}
        canManage
        onChanged={() => {}}
      />,
    );

    expect(screen.getByTestId("match-availability-no-request")).toHaveTextContent(
      "Noch keine Rückmeldung angefragt.",
    );
    expect(screen.queryByTestId("participation-request-config-editor")).not.toBeInTheDocument();
    expect(screen.getByTestId("match-availability-request-cta")).toBeInTheDocument();
  });

  it("opens detailed configuration only from Verwalten", () => {
    render(
      <MatchAvailabilityCollectionPanel
        matchId="m1"
        timeZone="Europe/Zurich"
        meta={meta({
          requestActive: true,
          participationResponseDueAt: "2026-10-15T16:00:00.000Z",
          outstandingPlayerCount: 2,
          canSendReminder: true,
        })}
        canManage
        onChanged={() => {}}
      />,
    );

    expect(screen.getByTestId("match-availability-deadline-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("participation-request-config-editor")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("match-availability-manage-cta"));

    expect(screen.getByTestId("participation-request-config-editor")).toBeInTheDocument();
  });
});
