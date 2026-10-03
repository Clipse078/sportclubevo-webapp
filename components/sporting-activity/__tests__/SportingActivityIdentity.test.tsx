/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SportingActivityIdentity } from "../SportingActivityIdentity";
import {
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
  buildTrainingActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";

describe("SportingActivityIdentity", () => {
  const startAt = new Date("2026-10-10T15:00:00.000Z");

  it("uses canonical semantic type pill variants only", () => {
    const training = buildTrainingActivityPresentation({
      resourceKey: "t:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      clubName: "FC Allschwil",
      startAt,
      facilityName: "Kunstrasen 2",
    });
    render(<SportingActivityIdentity presentation={training} />);
    expect(screen.getByText("TRAINING").getAttribute("data-activity-type-pill")).toBe(
      "training-blue",
    );

    const match = buildMatchActivityPresentation({
      resourceKey: "m:1",
      title: "Spiel",
      typeLabel: "Spiel",
      homeAway: "HOME",
      tenantClubName: "FC Allschwil",
      location: "Im Brüel",
      startAt,
      teamName: "FC Allschwil",
      opponentName: "FC Binningen",
    });
    render(<SportingActivityIdentity presentation={match} />);
    expect(screen.getByText("SPIEL").getAttribute("data-activity-type-pill")).toBe("match-red");

    const tournament = buildTournamentActivityPresentation({
      resourceKey: "x:1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      homeAway: "AWAY",
      organiserName: "FC Arisdorf",
      location: "Gemeindesportplatz",
      startAt,
    });
    render(<SportingActivityIdentity presentation={tournament} />);
    expect(screen.getByText("TURNIER").getAttribute("data-activity-type-pill")).toBe(
      "tournament-orange",
    );
  });

  it("places home/away context beside primary when type pill is on meta rail", () => {
    const tournament = buildTournamentActivityPresentation({
      resourceKey: "x:2",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      homeAway: "AWAY",
      organiserName: "FC Arisdorf",
      location: "Gemeindesportplatz",
      startAt,
    });
    render(
      <SportingActivityIdentity presentation={tournament} mode="compact" showTypeLine={false} />,
    );
    const identity = screen.getByTestId("sporting-activity-identity");
    expect(identity.textContent).toMatch(/PlayMore Turnier.*Auswärts/s);
    expect(screen.queryByText("TURNIER")).not.toBeInTheDocument();
  });

  it("does not fabricate club-location when data is missing", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "t:2",
      title: "Training",
      typeLabel: "Training",
      startAt,
    });
    render(<SportingActivityIdentity presentation={presentation} />);
    expect(screen.queryByText(/undefined|-\s*$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Unbekannt")).not.toBeInTheDocument();
  });
});
