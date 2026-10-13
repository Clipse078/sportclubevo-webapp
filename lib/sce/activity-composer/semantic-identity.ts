import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";
import type { SceActivityCreateKind } from "./types";

export type SceActivityComposerSemanticIdentity = {
  activityKind: SportingActivityKind;
  typeLabel: string;
  colorToken: "training-blue" | "match-red" | "tournament-orange" | "club-event-violet";
};

const CREATE_KIND_IDENTITY: Record<SceActivityCreateKind, SceActivityComposerSemanticIdentity> = {
  MATCH: {
    activityKind: "MATCH",
    typeLabel: "SPIEL",
    colorToken: "match-red",
  },
  TRAINING: {
    activityKind: "TRAINING",
    typeLabel: "TRAINING",
    colorToken: "training-blue",
  },
  TOURNAMENT: {
    activityKind: "TOURNAMENT",
    typeLabel: "TURNIER",
    colorToken: "tournament-orange",
  },
  CLUB_EVENT: {
    activityKind: "EVENT",
    typeLabel: "VERANSTALTUNG",
    colorToken: "club-event-violet",
  },
};

export function resolveSceActivityComposerSemanticIdentity(
  kind: SceActivityCreateKind,
): SceActivityComposerSemanticIdentity {
  return CREATE_KIND_IDENTITY[kind];
}
