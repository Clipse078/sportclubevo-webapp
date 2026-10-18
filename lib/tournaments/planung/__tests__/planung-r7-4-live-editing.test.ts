import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateRoundRobinFixtures } from "@/lib/tournament-scheduling/fixtures/round-robin";
import {
  normalizeStoredRoundRobinMeetingsForHomeAwayToggle,
  resolveEffectiveRoundRobinMeetingsPerOpponent,
} from "../planung-round-robin-home-away";
import { buildPlanungTimeScale, planungInstantsEqual } from "../time-scale";

describe("01K-R7.4 — live Spielplan correctness", () => {
  const settings = readFileSync(
    join(
      process.cwd(),
      "components/admin/tournamentcenter/planung/TournamentPlanungSpielplanSettings.tsx",
    ),
    "utf8",
  );
  const queue = readFileSync(
    join(process.cwd(), "lib/tournaments/planung/use-planung-schedule-mutation-queue.ts"),
    "utf8",
  );
  const reconcile = readFileSync(
    join(process.cwd(), "lib/tournaments/planung/planung-live-schedule-reconcile.server.ts"),
    "utf8",
  );
  const topology = readFileSync(
    join(
      process.cwd(),
      "lib/tournaments/planung/planung-fixture-topology-regeneration.server.ts",
    ),
    "utf8",
  );
  const board = readFileSync(
    join(process.cwd(), "components/admin/tournamentcenter/planung/TournamentPlanungBoard.tsx"),
    "utf8",
  );

  it("A — serial latest-intent mutation pipeline (no parallel editor PATCH storms)", () => {
    expect(settings).toMatch(/usePlanungScheduleMutationQueue/);
    expect(settings).toMatch(/enqueueScheduleMutation/);
    expect(queue).toMatch(/chainRef\.current = chainRef.current\.then/);
    expect(settings).not.toMatch(/syncGenerationRef/);
  });

  it("B — timing debounce without manual apply", () => {
    expect(settings).toMatch(/TIMING_DEBOUNCE_MS/);
    expect(settings).not.toMatch(/planung-timing-regenerate/);
    expect(settings).not.toMatch(/Spielplan neu berechnen/);
  });

  it("C — user-facing stale revision message, not technical mismatch text", () => {
    const errors = readFileSync(
      join(process.cwd(), "lib/tournaments/planung/planung-schedule-mutation-errors.ts"),
      "utf8",
    );
    expect(errors).toMatch(/Der Spielplan wurde zwischenzeitlich geändert/);
    expect(settings).not.toMatch(/Schedule revision mismatch/);
  });

  it("D — home/away topology uses canonical regeneration, not side reorientation only", () => {
    expect(reconcile).toMatch(/regeneratePlanungFixtureTopologyForHomeAway/);
    expect(reconcile).not.toMatch(/reorientPlanungFixtureSidesForHomeAway/);
    expect(topology).toMatch(/generateTournamentFixturesForEvent/);
    expect(topology).toMatch(/tournamentFixture\.deleteMany/);
  });

  it("E — ROUND_ROBIN OFF single leg vs ON hin+rück for four teams", () => {
    const participants = ["a", "b", "c", "d"];
    const off = generateRoundRobinFixtures({
      participantIds: participants,
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 1, homeAwayRelevance: "OFF" },
    });
    expect(off).toHaveLength(6);

    const meetingsOn = resolveEffectiveRoundRobinMeetingsPerOpponent(1, "ON");
    expect(meetingsOn).toBe(2);
    const on = generateRoundRobinFixtures({
      participantIds: participants,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: meetingsOn,
        homeAwayRelevance: "ON",
      },
    });
    expect(on).toHaveLength(12);
    for (let i = 0; i < participants.length; i += 1) {
      for (let j = i + 1; j < participants.length; j += 1) {
        const p = participants[i];
        const q = participants[j];
        const pair = on.filter(
          (f) =>
            (f.sideAParticipantId === p && f.sideBParticipantId === q) ||
            (f.sideAParticipantId === q && f.sideBParticipantId === p),
        );
        expect(pair).toHaveLength(2);
        expect(pair.some((f) => f.sideAParticipantId === p)).toBe(true);
        expect(pair.some((f) => f.sideAParticipantId === q)).toBe(true);
      }
    }
  });

  it("F — meetings normalization when toggling Home/Away", () => {
    expect(normalizeStoredRoundRobinMeetingsForHomeAwayToggle(1, "OFF", "ON")).toBe(2);
    expect(normalizeStoredRoundRobinMeetingsForHomeAwayToggle(2, "ON", "OFF")).toBe(1);
  });

  it("G — breaks render with instant-normalized anchors between fixture rows", () => {
    const scale = buildPlanungTimeScale({
      windowStartUtc: "2026-06-01T08:00:00.000Z",
      windowEndUtc: "2026-06-01T18:00:00.000Z",
      matchDurationMinutes: 12,
      transitionMinutes: 3,
      assignmentStartUtc: ["2026-06-01T08:00:00.000Z", "2026-06-01T08:30:00.000Z"],
      breakStartUtc: ["2026-06-01T08:15:00.000Z"],
    });
    expect(scale.rowAnchorsUtc.some((a) => planungInstantsEqual(a, "2026-06-01T08:15:00.000Z"))).toBe(
      true,
    );
    expect(board).toMatch(/planungInstantsEqual/);
    expect(board).toMatch(/planung-board-all-pitches-break/);
  });

  it("H — timing-only reconcile does not call fixture topology regeneration by default", () => {
    expect(reconcile).toMatch(/topologyRegenerated/);
    expect(reconcile).toMatch(/fixtureCount > 0 \|\| topologyRegenerated/);
  });
});
