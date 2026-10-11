import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import type { TournamentDto } from "@/lib/tournaments/types";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import { resolveSceClubEventPresentationFromLegacy } from "./adapters/club-event";
import { resolveSceMatchPresentation } from "./adapters/match";
import { resolveSceTrainingPresentationFromLegacy } from "./adapters/training";
import { resolveSceTournamentPresentation } from "./adapters/tournament";
import type { SceActivityKind, SceActivityPresentationModel } from "./types";

export type SceActivityPresentationSource =
  | {
      kind: "MATCH";
      match: MatchcenterMatchSummary;
      tenantLogoUrl?: string | null;
      tenantClubName?: string | null;
      assessment?: MatchcenterOperationalAssessment;
      pitchLabel?: string | null;
    }
  | {
      kind: "TRAINING";
      presentation: SportingActivityPresentation;
    }
  | {
      kind: "TOURNAMENT";
      tournament: TournamentDto;
      tenantClubName?: string | null;
    }
  | {
      kind: "CLUB_EVENT";
      presentation: SportingActivityPresentation;
      organiserDisplayName?: string | null;
    };

export function resolveSceActivityPresentation(
  source: SceActivityPresentationSource,
): SceActivityPresentationModel {
  switch (source.kind) {
    case "MATCH":
      return resolveSceMatchPresentation(source);
    case "TRAINING":
      return resolveSceTrainingPresentationFromLegacy(source.presentation);
    case "TOURNAMENT":
      return resolveSceTournamentPresentation({
        tournament: source.tournament,
        tenantClubName: source.tenantClubName,
      });
    case "CLUB_EVENT":
      return resolveSceClubEventPresentationFromLegacy(source.presentation, {
        organiserDisplayName: source.organiserDisplayName,
      });
    default: {
      const _exhaustive: never = source;
      throw new Error("Unsupported SceActivityPresentationSource");
    }
  }
}

export function assertSceActivityKind(
  model: SceActivityPresentationModel,
  expected: SceActivityKind,
): void {
  if (model.kind !== expected) {
    throw new Error(`Expected SceActivityKind ${expected}, received ${model.kind}`);
  }
}
