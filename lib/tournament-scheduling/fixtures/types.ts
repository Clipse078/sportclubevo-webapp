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
}

export interface RoundRobinGenerationInput {
  /** Stable tournament participant ids in canonical seed order (see ordering policy). */
  participantIds: readonly string[];
  config?: RoundRobinGenerationConfig;
}
