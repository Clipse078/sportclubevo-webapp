/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import PlayerReleasePlanningSheet from "@/components/admin/teams/PlayerReleasePlanningSheet";

function activity(
  eventId: string,
  teamSeasonId: string,
  teamLabel: string,
  dateLine: string,
  startAt: string,
) {
  return {
    eventId,
    eventType: "MATCH" as const,
    targetTeamSeasonId: teamSeasonId,
    targetTeamId: `team-${teamSeasonId}`,
    targetTeamLabel: teamLabel,
    startAt,
    dateGroupKey: startAt.slice(0, 10),
    dateLine,
    timeLine: "15:00",
    headline: `${teamLabel} · Gegner`,
    subline: null,
    locationLine: "Im Brüel",
    selectable: true,
    partialEligibilityNote: null,
  };
}

function buildCandidatesResponse(options?: {
  sourceEventContext?: { startAt: string; dateLine: string; timeLine: string; title: string } | null;
  planningMode?: string;
}) {
  const b2Activities = [
    activity("event-b2-a", "ts-b2", "Junioren B2", "So. 18.10.", "2026-10-18T13:00:00.000Z"),
    activity("event-b2-b", "ts-b2", "Junioren B2", "Mi. 21.10.", "2026-10-21T17:30:00.000Z"),
    activity("event-b2-far", "ts-b2", "Junioren B2", "Sa. 31.10.", "2026-10-31T12:00:00.000Z"),
  ];
  const aActivities = [
    activity("event-a-a", "ts-a", "Junioren A", "Mi. 21.10.", "2026-10-21T18:00:00.000Z"),
  ];
  return {
    players: [{ personId: "p1", displayName: "Spieler 1" }],
    activitiesByDate: [],
    sourceTeamContext: { label: "B1", lines: [] },
    targetTeams: [
      {
        targetTeamSeasonId: "ts-b2",
        targetTeamId: "team-b2",
        targetTeamLabel: "Junioren B2",
        activityCount: 3,
        activities: b2Activities,
      },
      {
        targetTeamSeasonId: "ts-a",
        targetTeamId: "team-a",
        targetTeamLabel: "Junioren A",
        activityCount: 1,
        activities: aActivities,
      },
    ],
    sourceEventContext: options?.sourceEventContext ?? null,
    planningMode: options?.planningMode ?? "KADER",
  };
}

function stubPlannerFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/plan/candidates")) {
        return new Response(JSON.stringify(buildCandidatesResponse()), { status: 200 });
      }
      if (url.includes("/plan") && !url.includes("candidates")) {
        const body = init?.body ? (JSON.parse(String(init.body)) as { eventIds: string[] }) : null;
        const activityCount = body?.eventIds.length ?? 0;
        return new Response(
          JSON.stringify({
            review: {
              playerCount: 1,
              activityCount,
              validReleaseCount: activityCount,
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
}

function renderPlanner(entryPoint: "TEAM_KADER" | "MATCH_AUFGEBOT" = "TEAM_KADER", sourceEventId?: string) {
  return render(
    <PlayerReleasePlanningSheet
      open
      onClose={() => undefined}
      teamId="team-b1"
      teamSeasonId="ts-b1"
      personIds={["p1"]}
      personLabels={{ p1: "Spieler 1" }}
      onCompleted={async () => undefined}
      entryPoint={entryPoint}
      sourceEventId={sourceEventId}
    />,
  );
}

describe("PlayerReleasePlanningSheet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads candidates and shows review counts", async () => {
    stubPlannerFetch();
    renderPlanner();

    await waitFor(() => {
      expect(screen.getByTestId("player-release-plan-team-ts-b2")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("player-release-plan-activity-event-b2-a")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-b2"));
    expect(screen.getByTestId("player-release-plan-team-activities-view")).toBeInTheDocument();
    expect(screen.getByTestId("player-release-plan-activity-event-b2-a")).toBeInTheDocument();
    expect(screen.queryByTestId("player-release-plan-activity-event-a-a")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-b2-a"));
    fireEvent.click(screen.getByTestId("player-release-plan-apply-team"));

    await waitFor(() => {
      expect(screen.getByTestId("player-release-plan-target-teams")).toBeInTheDocument();
    });
    expect(screen.getByTestId("player-release-plan-team-ts-b2")).toHaveTextContent(/1 Einsatz ausgewählt/);

    fireEvent.click(screen.getByTestId("player-release-plan-review"));
    await waitFor(() => {
      expect(screen.getByTestId("player-release-plan-review-panel")).toHaveTextContent("1");
    });
  });

  it("master-detail: B2 two activities, apply, then A with B2 preserved", async () => {
    stubPlannerFetch();
    renderPlanner();

    await waitFor(() => screen.getByTestId("player-release-plan-team-open-ts-b2"));

    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-b2"));
    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-b2-a"));
    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-b2-b"));
    fireEvent.click(screen.getByTestId("player-release-plan-apply-team"));

    expect(screen.getByTestId("player-release-plan-team-ts-b2")).toHaveTextContent(/2 Eins.tze ausgewählt/);

    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-a"));
    expect(screen.queryByTestId("player-release-plan-activity-event-b2-a")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-a-a"));
    fireEvent.click(screen.getByTestId("player-release-plan-apply-team"));

    expect(screen.getByTestId("player-release-plan-team-ts-b2")).toHaveTextContent(/2 Eins.tze ausgewählt/);
    expect(screen.getByTestId("player-release-plan-team-ts-a")).toHaveTextContent(/1 Einsatz ausgewählt/);
    expect(screen.getByTestId("player-release-plan-preview-counts")).toHaveTextContent("3 Einsätze");
  });

  it("reopens B2 with preselection, edit count, and preserves conditions", async () => {
    stubPlannerFetch();
    renderPlanner();

    await waitFor(() => screen.getByTestId("player-release-plan-team-open-ts-b2"));

    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-b2"));
    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-b2-a"));
    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-b2-b"));
    fireEvent.click(screen.getByTestId("player-release-plan-details-toggle"));
    fireEvent.change(screen.getByTestId("player-release-plan-max-event-b2-a"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByTestId("player-release-plan-apply-team"));

    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-a"));
    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-a-a"));
    fireEvent.click(screen.getByTestId("player-release-plan-apply-team"));

    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-b2"));
    const b2View = screen.getByTestId("player-release-plan-team-activities-view");
    expect(within(b2View).getByTestId("player-release-plan-activity-event-b2-a")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(b2View).getByTestId("player-release-plan-activity-event-b2-b")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-b2-b"));
    fireEvent.click(screen.getByTestId("player-release-plan-details-toggle"));
    expect(screen.getByTestId("player-release-plan-max-event-b2-a")).toHaveValue(30);

    fireEvent.click(screen.getByTestId("player-release-plan-apply-team"));
    expect(screen.getByTestId("player-release-plan-team-ts-b2")).toHaveTextContent(/1 Einsatz ausgewählt/);

    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-b2"));
    fireEvent.click(screen.getByTestId("player-release-plan-activity-event-b2-a"));
    fireEvent.click(screen.getByTestId("player-release-plan-apply-team"));
    expect(screen.getByTestId("player-release-plan-team-ts-b2")).toHaveTextContent(/3 passende Einsätze/);
    expect(screen.getByTestId("player-release-plan-team-ts-b2")).not.toHaveTextContent(/ausgewählt/);
    expect(screen.getByTestId("player-release-plan-team-ts-a")).toHaveTextContent(/1 Einsatz ausgewählt/);
  });

  it("match entry starts on teams; kader entry starts on teams", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/plan/candidates")) {
          return new Response(
            JSON.stringify(
              buildCandidatesResponse({
                sourceEventContext: {
                  startAt: "2026-10-17T13:00:00.000Z",
                  dateLine: "Sa. 17.10.",
                  timeLine: "15:00",
                  title: "FC Concordia",
                },
                planningMode: "MATCH",
              }),
            ),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ review: { validReleaseCount: 0 } }), { status: 200 });
      }),
    );

    renderPlanner("MATCH_AUFGEBOT", "match-b1");
    await waitFor(() => screen.getByTestId("player-release-plan-source-match"));
    expect(screen.getByTestId("player-release-plan-target-teams")).toBeInTheDocument();
    expect(screen.queryByTestId("player-release-plan-team-activities-view")).not.toBeInTheDocument();

    cleanup();
    vi.restoreAllMocks();
    stubPlannerFetch();
    renderPlanner("TEAM_KADER");
    await waitFor(() => screen.getByTestId("player-release-plan-target-teams"));
    expect(screen.queryByTestId("player-release-plan-team-activities-view")).not.toBeInTheDocument();
  });

  it("match entry shows proximity partition for B2; kader shows all without Weitere initially", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        if (String(input).includes("/plan/candidates")) {
          return new Response(
            JSON.stringify(
              buildCandidatesResponse({
                sourceEventContext: {
                  startAt: "2026-10-17T13:00:00.000Z",
                  dateLine: "Sa. 17.10.",
                  timeLine: "15:00",
                  title: "FC Concordia",
                },
              }),
            ),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }),
    );

    renderPlanner("MATCH_AUFGEBOT", "match-b1");
    await waitFor(() => screen.getByTestId("player-release-plan-team-open-ts-b2"));
    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-b2"));
    expect(screen.getByTestId("player-release-plan-more-ts-b2")).toBeInTheDocument();
    expect(screen.queryByTestId("player-release-plan-activity-event-b2-far")).not.toBeInTheDocument();

    cleanup();
    vi.restoreAllMocks();
    stubPlannerFetch();
    renderPlanner("TEAM_KADER");
    await waitFor(() => screen.getByTestId("player-release-plan-team-open-ts-b2"));
    fireEvent.click(screen.getByTestId("player-release-plan-team-open-ts-b2"));
    expect(screen.getByTestId("player-release-plan-activity-event-b2-far")).toBeInTheDocument();
    expect(screen.queryByTestId("player-release-plan-more-ts-b2")).not.toBeInTheDocument();
  });
});
