/**
 * Canonical Smart Generator fixture entry point (01E1 foundation).
 */

import { generateRoundRobinFixtures } from "./round-robin";
import { RoundRobinGenerationValidationError } from "./errors";
import type {
  TournamentFixtureGenerationDefinition,
  TournamentFixtureGenerationRequest,
} from "./types";

export function generateTournamentFixtures(
  request: TournamentFixtureGenerationRequest,
): TournamentFixtureGenerationDefinition[] {
  switch (request.strategy) {
    case "ROUND_ROBIN":
      return generateRoundRobinFixtures({
        participantIds: request.participantIds,
        config: {
          format: "ROUND_ROBIN",
          ...request.roundRobin,
        },
      });
    case "SMART_MIX":
      throw new RoundRobinGenerationValidationError(
        "TOURNAMENT_FORMAT_UNSUPPORTED",
        "SMART_MIX generation is not implemented",
      );
    default: {
      const exhaustive: never = request.strategy;
      throw new RoundRobinGenerationValidationError(
        "TOURNAMENT_FORMAT_UNSUPPORTED",
        `Unsupported generation strategy: ${String(exhaustive)}`,
      );
    }
  }
}
