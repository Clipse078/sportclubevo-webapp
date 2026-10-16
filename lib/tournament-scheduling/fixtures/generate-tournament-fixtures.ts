/**
 * Canonical Smart Generator fixture entry point (01E1 foundation).
 */

import { generateRoundRobinFixtures } from "./round-robin";
import { generateSmartMixFixtures } from "./smart-mix";
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
    case "SMART_MIX": {
      const config = request.smartMix;
      if (!config?.targetMatchesPerParticipant) {
        throw new RoundRobinGenerationValidationError(
          "TOURNAMENT_SMART_MIX_TARGET_INVALID",
          "targetMatchesPerParticipant is required for SMART_MIX",
        );
      }
      return generateSmartMixFixtures({
        participantIds: request.participantIds,
        config,
      });
    }
    default: {
      const exhaustive: never = request.strategy;
      throw new RoundRobinGenerationValidationError(
        "TOURNAMENT_FORMAT_UNSUPPORTED",
        `Unsupported generation strategy: ${String(exhaustive)}`,
      );
    }
  }
}
