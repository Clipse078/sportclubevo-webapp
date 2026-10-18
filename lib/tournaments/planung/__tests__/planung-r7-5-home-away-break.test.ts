import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { zonedTimeToUtc } from "@/lib/training/recurrence";
import {
  generateRoundRobinFixtures,
  expectedRoundRobinGlobalRoundCount,
} from "@/lib/tournament-scheduling/fixtures/round-robin";
import {
  normalizeStoredRoundRobinMeetingsForHomeAwayToggle,
  normalizeStoredSmartMixTargetForHomeAwayToggle,
  resolveEffectiveRoundRobinMeetingsPerOpponent,
} from "../planung-round-robin-home-away";
import {
  combineTournamentStartDateWithLocalTime,
  resolveComposerBreakDateTimes,
} from "@/lib/tournaments/composer/tournament-composer-planner-breaks";
import { parseTenantLocalDateTimeInput } from "@/lib/events/tenant-local-datetime";
import { EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES } from "@/lib/tournament-scheduling/schedule-optimiser/constants";
import { buildPlanungScheduleSections } from "../planung-schedule-sections";
import type { TournamentPlanungBoardCell } from "../types";

const TIMEZONE = "Europe/Zurich";

describe("01K-R7.5 — Home/Away six-round schedule", () => {
  const participants = ["p-a", "p-b", "p-c", "p-d"];

  function fixtureSet(homeAway: "ON" | "OFF") {
    const meetings = resolveEffectiveRoundRobinMeetingsPerOpponent(1, homeAway);
    return generateRoundRobinFixtures({
      participantIds: participants,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: meetings,
        homeAwayRelevance: homeAway,
      },
    });
  }

  it("OFF — 6 fixtures and 3 competition rounds", () => {
    const fixtures = fixtureSet("OFF");
    expect(fixtures).toHaveLength(6);
    expect(expectedRoundRobinGlobalRoundCount(4, 1)).toBe(3);
  });

  it("ON — 12 fixtures, 6 rounds, both orientations per pair", () => {
    const fixtures = fixtureSet("ON");
    expect(fixtures).toHaveLength(12);
    expect(expectedRoundRobinGlobalRoundCount(4, 2)).toBe(6);

    for (let i = 0; i < participants.length; i += 1) {
      for (let j = i + 1; j < participants.length; j += 1) {
        const p = participants[i];
        const q = participants[j];
        const pair = fixtures.filter(
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

  it("OFF → ON → OFF fixture counts via stored meetings normalization", () => {
    let meetings = 1;
    meetings = normalizeStoredRoundRobinMeetingsForHomeAwayToggle(meetings, "OFF", "ON");
    expect(meetings).toBe(2);
    expect(fixtureSet("ON")).toHaveLength(12);
    meetings = normalizeStoredRoundRobinMeetingsForHomeAwayToggle(meetings, "ON", "OFF");
    expect(meetings).toBe(1);
    expect(fixtureSet("OFF")).toHaveLength(6);
  });

  it("visible schedule sections expose six round groups when twelve fixtures are assigned", () => {
    const fixtures = fixtureSet("ON");
    const fixtureMeta = fixtures.map((f, idx) => ({
      id: `fx-${idx}`,
      stageKey: f.stageKey,
      roundIndex: f.roundIndex,
      slotIndexInRound: f.slotIndexInRound,
      phaseLabel: null,
      groupLabel: null,
    }));
    const baseStart = Date.UTC(2026, 9, 25, 8, 0, 0);
    const cells: TournamentPlanungBoardCell[] = fixtures.map((f, idx) => ({
      kind: "FIXTURE" as const,
      fixtureId: `fx-${idx}`,
      assignmentId: `asg-${idx}`,
      startUtc: new Date(baseStart + idx * 15 * 60_000).toISOString(),
      endUtc: new Date(baseStart + idx * 15 * 60_000 + 10 * 60_000).toISOString(),
      tournamentPitchId: idx % 2 === 0 ? "pitch-1" : "pitch-2",
      pitchLabel: idx % 2 === 0 ? "Feld 1" : "Feld 2",
      phaseLabel: null,
      groupLabel: null,
      roundIndex: f.roundIndex,
      slotIndexInRound: f.slotIndexInRound,
      sideA: { participantId: f.sideAParticipantId, label: "A", crestUrl: null },
      sideB: { participantId: f.sideBParticipantId, label: "B", crestUrl: null },
      accessibleLabel: "A vs B",
    }));

    const sections = buildPlanungScheduleSections({
      fixtures: fixtureMeta,
      cells,
      pitchLabelById: new Map([
        ["pitch-1", "Feld 1"],
        ["pitch-2", "Feld 2"],
      ]),
      timezone: TIMEZONE,
    });

    const roundSections = sections.filter((s) => !s.sectionId.startsWith("break:"));
    expect(roundSections).toHaveLength(6);
  });

  it("topology reconcile requires complete assignment set before sync", () => {
    const orchestration = readFileSync(
      join(process.cwd(), "lib/tournament-scheduling/tournament-schedule-orchestration-service.ts"),
      "utf8",
    );
    const reconcile = readFileSync(
      join(process.cwd(), "lib/tournaments/planung/planung-live-schedule-reconcile.server.ts"),
      "utf8",
    );
    expect(orchestration).toMatch(/topologyReconciled/);
    expect(orchestration).toMatch(/removeAssignmentsNotInResult/);
    expect(orchestration).toMatch(/regeneration\.assignments\.length === engineFixtureCount/);
    expect(reconcile).toMatch(/topologyReconciled: topologyRegenerated/);
    expect(reconcile).toMatch(/completeForTopology/);
    expect(EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES).toBeGreaterThanOrEqual(12);
  });
});

describe("01K-R7.5 — break local time + timezone", () => {
  it("resolves 11:00 + 10 min on 2026-10-25 in Europe/Zurich", () => {
    const interval = resolveComposerBreakDateTimes(
      {
        localId: "b1",
        label: "Pause",
        startLocalTime: "11:00",
        durationMinutes: 10,
        scope: "ALL_PITCHES",
        tournamentPitchLocalIds: [],
        fieldSelectionAdvanced: false,
      },
      "2026-10-25T10:00",
      TIMEZONE,
    );
    expect(interval).toEqual({ startAt: "2026-10-25T11:00", endAt: "2026-10-25T11:10" });

    const startAt = parseTenantLocalDateTimeInput(interval!.startAt, TIMEZONE);
    const endAt = parseTenantLocalDateTimeInput(interval!.endAt, TIMEZONE);
    expect(endAt!.getTime() - startAt!.getTime()).toBe(10 * 60_000);
  });

  it("combines UTC tournament start ISO with local break time using timezone", () => {
    const tournamentStartUtc = zonedTimeToUtc("2026-10-25", "10:00", TIMEZONE);
    const combined = combineTournamentStartDateWithLocalTime(
      tournamentStartUtc.toISOString(),
      "11:00",
      TIMEZONE,
    );
    expect(combined).toBe("2026-10-25T11:00");
  });

  it("planung break resolver uses tenant-local tournament date, not raw UTC ISO", () => {
    const service = readFileSync(
      join(process.cwd(), "lib/tournaments/planung/planung-operational-config-service.ts"),
      "utf8",
    );
    expect(service).toMatch(/utcInstantToDateTimeLocalValue\(event\.startAt, tenantTimeZone\)/);
    expect(service).not.toMatch(/event\.startAt\.toISOString\(\)/);
  });
});
