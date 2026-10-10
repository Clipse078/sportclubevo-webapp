/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MatchAvailabilityTrainerRecordMenu from "../MatchAvailabilityTrainerRecordMenu";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("MatchAvailabilityTrainerRecordMenu", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("uses proxy-recording wording instead of trainer-owned Verfügbarkeit", () => {
    render(
      <MatchAvailabilityTrainerRecordMenu
        matchId="m1"
        personId="p1"
        displayName="SCE Testspieler 01"
        disabled={false}
        hasParticipationResponse={false}
        onRecorded={() => {}}
      />,
    );

    expect(screen.getByTestId("match-availability-manage-p1")).toHaveTextContent(
      "Rückmeldung eintragen",
    );
    expect(screen.queryByText("Verfügbarkeit")).not.toBeInTheDocument();
  });

  it("shows verwalten when a participation row exists", () => {
    render(
      <MatchAvailabilityTrainerRecordMenu
        matchId="m1"
        personId="p2"
        displayName="SCE Testspieler 06"
        disabled={false}
        hasParticipationResponse
        onRecorded={() => {}}
      />,
    );

    expect(screen.getByTestId("match-availability-manage-p2")).toHaveTextContent(
      "Rückmeldung verwalten",
    );
  });

  it("offers reset as Rückmeldung zurücksetzen, not Offen as a positive choice", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(
      <MatchAvailabilityTrainerRecordMenu
        matchId="m1"
        personId="p1"
        displayName="SCE Testspieler 01"
        disabled={false}
        hasParticipationResponse={false}
        onRecorded={() => {}}
      />,
    );

    fireEvent.click(screen.getByTestId("match-availability-manage-p1"));

    expect(screen.getByText("Verfügbar")).toBeInTheDocument();
    expect(screen.getByText("Nicht verfügbar")).toBeInTheDocument();
    expect(screen.getByText("Unsicher")).toBeInTheDocument();
    expect(screen.queryByText("Offen (zurücksetzen)")).not.toBeInTheDocument();
    expect(screen.getByTestId("match-availability-reset-p1")).toHaveTextContent(
      "Rückmeldung zurücksetzen",
    );

    fireEvent.click(screen.getByTestId("match-availability-reset-p1"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/matchcenter/m1/participation-response",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ personId: "p1", status: "OPEN" }),
        }),
      );
    });
  });
});
