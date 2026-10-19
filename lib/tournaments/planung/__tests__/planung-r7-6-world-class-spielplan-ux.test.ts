import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateRoundRobinFixtures,
  expectedRoundRobinGlobalRoundCount,
} from "@/lib/tournament-scheduling/fixtures/round-robin";
import {
  normalizeStoredRoundRobinMeetingsForHomeAwayToggle,
  resolveEffectiveRoundRobinMeetingsPerOpponent,
} from "../planung-round-robin-home-away";
import { buildPlanungTimingConsequence } from "../planung-scheduling-settings-presentation";
import { resolveTournamentPitchColumnPresentation } from "../tournament-pitch-presentation";

describe("01K-R7.6 — world-class Spielplan UX", () => {
  const roadmap = readFileSync(
    join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01K.md"),
    "utf8",
  );
  const settings = readFileSync(
    join(
      process.cwd(),
      "components/admin/tournamentcenter/planung/TournamentPlanungSpielplanSettings.tsx",
    ),
    "utf8",
  );
  const workspace = readFileSync(
    join(process.cwd(), "components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx"),
    "utf8",
  );
  const masterSchedule = readFileSync(
    join(process.cwd(), "components/sce/tournament/TournamentSpielplanMasterSchedule.tsx"),
    "utf8",
  );
  const fixtureCard = readFileSync(
    join(process.cwd(), "components/sce/tournament/SceTournamentFixtureCard.tsx"),
    "utf8",
  );
  const reconcile = readFileSync(
    join(process.cwd(), "lib/tournaments/planung/planung-live-schedule-reconcile.server.ts"),
    "utf8",
  );

  it("documents R7.6 product ground rules and deferred Planner 02 scope", () => {
    expect(roadmap).toMatch(/01K-R7\.6|R7\.6/i);
    expect(roadmap).toMatch(/WORLD-CLASS|premium|minimal UX/i);
    expect(roadmap).toMatch(/Primary output.*Spielplan|Spielplan is the primary/i);
    expect(roadmap).toMatch(/ONE CANONICAL|canonical schedule/i);
    expect(roadmap).toMatch(/BREAK_IS_FIXTURE = NO|not fixtures/i);
    expect(roadmap).toMatch(/Tournament Planner 02|01L|01M/i);
    expect(roadmap).toMatch(/Rotation|playing format|template/i);
  });

  it("A–C — home/away fixture counts and toggle normalization", () => {
    const participants = ["p-a", "p-b", "p-c", "p-d"];
    const off = generateRoundRobinFixtures({
      participantIds: participants,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: 1,
        homeAwayRelevance: "OFF",
      },
    });
    expect(off).toHaveLength(6);
    expect(expectedRoundRobinGlobalRoundCount(4, 1)).toBe(3);

    const onMeetings = resolveEffectiveRoundRobinMeetingsPerOpponent(1, "ON");
    const on = generateRoundRobinFixtures({
      participantIds: participants,
      config: {
        format: "ROUND_ROBIN",
        meetingsPerOpponent: onMeetings,
        homeAwayRelevance: "ON",
      },
    });
    expect(on).toHaveLength(12);
    expect(expectedRoundRobinGlobalRoundCount(4, 2)).toBe(6);

    let meetings = 1;
    meetings = normalizeStoredRoundRobinMeetingsForHomeAwayToggle(meetings, "OFF", "ON");
    expect(meetings).toBe(2);
    meetings = normalizeStoredRoundRobinMeetingsForHomeAwayToggle(meetings, "ON", "OFF");
    expect(meetings).toBe(1);
  });

  it("D — home/away side option removed from Spielplan settings (02D R9)", () => {
    expect(settings).not.toMatch(/planung-home-away-relevance/);
    expect(settings).not.toMatch(/Heim- und Auswärtsseiten berücksichtigen/);
    expect(settings).toMatch(/SwitchToggle/);
    expect(settings).not.toMatch(/type="checkbox"/);
  });

  it("E — live editing: no manual apply, subtle sync status", () => {
    expect(settings).not.toMatch(/Spielplan neu berechnen/);
    expect(workspace).toMatch(/Spielplan wird aktualisiert/);
    expect(workspace).not.toMatch(/timingConsequence\?\.status === "MATCHES"/);
  });

  it("F — performance: timing reconcile avoids fixture generator", () => {
    expect(reconcile).toMatch(/runTournamentScheduleRegeneration/);
    expect(reconcile).not.toMatch(/generateTournamentFixturesForEvent/);
  });

  it("G — team highlight de-emphasis without heavy glow", () => {
    expect(fixtureCard).toMatch(/opacity-\[0\.38\]/);
    expect(fixtureCard).not.toMatch(/shadow-md/);
    expect(fixtureCard).toMatch(/data-testid="sce-tournament-fixture-matchup-cluster"/);
  });

  it("H — master Spielplan break hierarchy (label before time)", () => {
    expect(masterSchedule).toMatch(/spielplan-all-pitches-break/);
    expect(masterSchedule).toMatch(/\{br\.label\}/);
    expect(masterSchedule).toMatch(/\{br\.timeLabel\}/);
  });

  it("I — feasibility failure copy is calm and singular", () => {
    const consequence = buildPlanungTimingConsequence("NEEDS_REGENERATION");
    expect(consequence?.headline).toBe("Der Spielplan passt noch nicht in die verfügbare Zeit.");
    expect(consequence?.recommendedTiming).toBeNull();
    expect(consequence?.structuralHint).toMatch(/Spielfeld/);
    expect(settings).toMatch(/planung-timing-consequence/);
    expect(settings).toMatch(/Empfehlung übernehmen/);
  });

  it("J — TournamentPitch column ready for optional format hint", () => {
    expect(resolveTournamentPitchColumnPresentation({ label: "Feld 1" })).toEqual({
      label: "Feld 1",
      formatHint: null,
    });
    expect(
      resolveTournamentPitchColumnPresentation({
        label: "Feld 5",
        playingFormatLabel: "6v6 · Grossfeld",
      }).formatHint,
    ).toBe("6v6 · Grossfeld");
  });

  it("K — view mode keeps edit controls separate", () => {
    expect(workspace).toMatch(/TournamentPlanungSpielplanOutput/);
    expect(workspace).toMatch(/TournamentPlanungSpielplanSettings/);
    expect(workspace).toMatch(/effectiveInteractionMode === "view"/);
    expect(workspace).toMatch(/effectiveInteractionMode === "edit"/);
    expect(workspace).not.toMatch(/TournamentPlanungPublicationPanel/);
  });
});
