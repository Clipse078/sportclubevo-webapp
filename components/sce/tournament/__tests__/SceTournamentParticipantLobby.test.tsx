/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { SceTournamentParticipantLobby } from "../SceTournamentParticipantLobby";

describe("SceTournamentParticipantLobby", () => {
  it("renders participant tiles with textual identity and crest bounds", () => {
    render(
      <SceTournamentParticipantLobby
        participants={[
          {
            localId: "p1",
            kind: "TEAM",
            accessibleLabel: "FC Allschwil, F1, Eigenes Team",
            clubLine: "FC Allschwil",
            designationLine: "F1",
            kindBadge: "EIGENES TEAM",
            identity: buildClubIdentity({
              displayName: "FC Allschwil",
              logoUrl: "/images/logos/fc-allschwil.png",
            }),
          },
        ]}
        onRemoveParticipant={() => undefined}
        addParticipantSlot={<div data-testid="add-slot" />}
      />,
    );
    expect(screen.getByText("Teilnehmende Teams")).toBeTruthy();
    expect(screen.getByText("1 Teilnehmer")).toBeTruthy();
    expect(screen.getByText("FC Allschwil")).toBeTruthy();
    expect(screen.getByText("F1")).toBeTruthy();
    expect(screen.getByText("EIGENES TEAM")).toBeTruthy();
    expect(screen.getByTestId("club-crest-bounds")).toBeTruthy();
    expect(screen.getByTestId("add-slot")).toBeTruthy();
  });
});
