import type { SportingActivityKind, SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import type { SceActivityKind, SceActivityPresentationModel } from "../types";
import { resolveSceClubEventPresentationFromLegacy } from "./club-event";
import { resolveSceTrainingPresentationFromLegacy } from "./training";

export function mapLegacySportingActivityKindToSceKind(
  kind: SportingActivityKind,
): SceActivityKind {
  switch (kind) {
    case "TRAINING":
      return "TRAINING";
    case "MATCH":
      return "MATCH";
    case "TOURNAMENT":
      return "TOURNAMENT";
    case "EVENT":
      return "CLUB_EVENT";
  }
}

/**
 * Converts the serializable UX-01 read-model where fixture club identities are not required.
 * MATCH entries must use `resolveSceMatchPresentation` when `MatchcenterMatchSummary` is available.
 */
export function resolveSceActivityPresentationFromLegacy(
  presentation: SportingActivityPresentation,
  options: { organiserDisplayName?: string | null } = {},
): SceActivityPresentationModel {
  switch (presentation.identity.activityKind) {
    case "TRAINING":
      return resolveSceTrainingPresentationFromLegacy(presentation);
    case "TOURNAMENT":
      throw new Error(
        "resolveSceActivityPresentationFromLegacy: TOURNAMENT requires resolveSceTournamentPresentation(TournamentDto)",
      );
    case "MATCH":
      throw new Error(
        "resolveSceActivityPresentationFromLegacy: MATCH requires resolveSceMatchPresentation(MatchcenterMatchSummary)",
      );
    case "EVENT":
      return resolveSceClubEventPresentationFromLegacy(presentation, options);
    default: {
      const _exhaustive: never = presentation.identity.activityKind;
      throw new Error(`Unsupported activity kind: ${_exhaustive}`);
    }
  }
}
