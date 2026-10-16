/**
 * SCE-TOURNAMENT-PLANNER-01E3C — knockout bracket generation types.
 */

import type { TournamentFixtureDefinition } from "../types";

export type KnockoutEntrantInput =
  | { kind: "CONCRETE_PARTICIPANT"; participantId: string }
  | { kind: "QUALIFICATION_REFERENCE"; qualificationSourceId: string };

export interface GenerateKnockoutBracketPureInput {
  stageKey: string;
  entrants: readonly KnockoutEntrantInput[];
}

export type KnockoutFixtureSideSource =
  | { type: "CONCRETE_PARTICIPANT"; participantId: string }
  | { type: "QUALIFICATION_REFERENCE"; qualificationSourceId: string }
  | { type: "WINNER_OF_FIXTURE"; logicalFixtureKey: string };

export interface KnockoutFixtureSideSpec {
  sideA: KnockoutFixtureSideSource;
  sideB: KnockoutFixtureSideSource;
}

export interface GeneratedKnockoutFixtureSpec {
  roundIndex: number;
  slotIndexInRound: number;
  stageKey: string;
  generatorKey: string;
  /** Logical key for winner-of references before persistence. */
  logicalFixtureKey: string;
  sides: KnockoutFixtureSideSpec;
}

export interface KnockoutByeAdvancementSpec {
  roundIndex: number;
  slotIndexInRound: number;
  entrant: KnockoutEntrantInput;
}

export interface KnockoutBracketDiagnostics {
  entrantCount: number;
  bracketSize: number;
  byeCount: number;
  roundCount: number;
  realFixtureCount: number;
  fixturesByRound: Record<number, number>;
  byeAdvancements: KnockoutByeAdvancementSpec[];
}

export interface GenerateKnockoutBracketPureResult {
  fixtures: GeneratedKnockoutFixtureSpec[];
  diagnostics: KnockoutBracketDiagnostics;
}

export interface GenerateKnockoutBracketForPhaseInput {
  tournamentId: string;
  phaseId: string;
  entrants: readonly KnockoutEntrantInput[];
}

export interface GenerateKnockoutBracketForPhaseResult {
  fixtures: readonly TournamentFixtureDefinition[];
  diagnostics: KnockoutBracketDiagnostics;
}
