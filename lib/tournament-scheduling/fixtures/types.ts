import type { HomeAwayRelevance } from "../smart-generator-architecture";

export type { HomeAwayRelevance };
import type { TournamentFixtureFormatId } from "./constants";

/** Pure fixture row suitable for persistence (no schedule fields). */
export interface TournamentFixtureGenerationDefinition {
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  sideAParticipantId: string;
  sideBParticipantId: string;
  generatorKey: string;
}

export interface RoundRobinGenerationConfig {
  format: TournamentFixtureFormatId;
  stageKey?: string;
  /** Product 1:n — default 1 (01C parity). */
  meetingsPerOpponent?: number;
  /** Fixture-side Home/Away semantics — default OFF (neutral youth tournaments). */
  homeAwayRelevance?: HomeAwayRelevance;
}

export interface RoundRobinGenerationInput {
  /** Stable tournament participant ids in canonical seed order (see ordering policy). */
  participantIds: readonly string[];
  config?: RoundRobinGenerationConfig;
}

export type TournamentFixtureGenerationStrategy = "ROUND_ROBIN" | "SMART_MIX";

export interface SmartMixGenerationConfig {
  stageKey?: string;
  /** Product input — matches each participant should play (exact or parity-adjusted). */
  targetMatchesPerParticipant: number;
  homeAwayRelevance?: HomeAwayRelevance;
}

export interface SmartMixGenerationInput {
  participantIds: readonly string[];
  config: SmartMixGenerationConfig;
}

export interface TournamentFixtureGenerationRequest {
  strategy: TournamentFixtureGenerationStrategy;
  participantIds: readonly string[];
  roundRobin?: RoundRobinGenerationConfig;
  smartMix?: SmartMixGenerationConfig;
}
