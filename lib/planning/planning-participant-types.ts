import type { ParticipationResponseStatus } from "@prisma/client";

export type PlanningParticipantRole =
  | "TRAINER"
  | "PLAYER"
  | "STAFF"
  | "TEAM"
  | "CLUB"
  | "OTHER";

export type PlanningParticipantRow = {
  id: string;
  displayName: string;
  role: PlanningParticipantRole;
  roleLabel?: string;
  avatarUrl?: string | null;
  participationStatus?: ParticipationResponseStatus | null;
  participationStatusLabel?: string | null;
  subLabel?: string | null;
};

export type PlanningParticipantsPresentation = {
  people: PlanningParticipantRow[];
  teams?: PlanningParticipantRow[];
  emptyStateKey?: "none" | "unsupported" | "noTeamSeason";
  footnoteKey?: string;
};
