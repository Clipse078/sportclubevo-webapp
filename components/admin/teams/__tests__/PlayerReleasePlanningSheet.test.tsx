/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PlayerReleasePlanningSheet from "@/components/admin/teams/PlayerReleasePlanningSheet";

describe("PlayerReleasePlanningSheet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads candidates and shows review counts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/plan/candidates")) {
          return new Response(
            JSON.stringify({
              players: [{ personId: "p1", displayName: "Spieler 1" }],
              activitiesByDate: [
                {
                  dateGroupKey: "2026-10-17",
                  dateLine: "Sa 17.10.",
                  activities: [
                    {
                      eventId: "event-1",
                      eventType: "MATCH",
                      targetTeamSeasonId: "ts-b2",
                      targetTeamId: "team-b2",
                      targetTeamLabel: "Junioren B2",
                      startAt: "2026-10-17T12:00:00.000Z",
                      dateGroupKey: "2026-10-17",
                      dateLine: "Sa 17.10.",
                      timeLine: "14:00",
                      headline: "Junioren B2 · Spiel",
                      subline: "FC X",
                      locationLine: null,
                      selectable: true,
                      partialEligibilityNote: null,
                    },
                  ],
                },
              ],
              sourceTeamContext: { label: "B1", lines: [] },
              targetTeams: [
                {
                  targetTeamSeasonId: "ts-b2",
                  targetTeamId: "team-b2",
                  targetTeamLabel: "Junioren B2",
                  activityCount: 1,
                  activities: [
                    {
                      eventId: "event-1",
                      eventType: "MATCH",
                      targetTeamSeasonId: "ts-b2",
                      targetTeamId: "team-b2",
                      targetTeamLabel: "Junioren B2",
                      startAt: "2026-10-17T12:00:00.000Z",
                      dateGroupKey: "2026-10-17",
                      dateLine: "Sa 17.10.",
                      timeLine: "14:00",
                      headline: "FC X",
                      subline: "Junioren B2 · Spiel",
                      locationLine: null,
                      selectable: true,
                      partialEligibilityNote: null,
                    },
                  ],
                },
              ],
              sourceEventContext: null,
              planningMode: "KADER",
            }),
            { status: 200 },
          );
        }
        if (url.includes("/plan") && !url.includes("candidates")) {
          return new Response(
            JSON.stringify({
              review: {
                playerCount: 1,
                activityCount: 1,
                validReleaseCount: 1,
                invalidCombinationCount: 0,
                warningCount: 0,
                invalidNote: null,
                combinations: [],
                activities: [],
              },
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
      }),
    );

    render(
      <PlayerReleasePlanningSheet
        open
        onClose={() => undefined}
        teamId="team-b1"
        teamSeasonId="ts-b1"
        personIds={["p1"]}
        personLabels={{ p1: "Spieler 1" }}
        onCompleted={async () => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("player-release-plan-team-ts-b2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("player-release-plan-team-ts-b2"));
    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-1"));
    fireEvent.click(screen.getByTestId("player-release-plan-review"));

    await waitFor(() => {
      expect(screen.getByTestId("player-release-plan-review-panel")).toHaveTextContent("1");
    });
  });
});
