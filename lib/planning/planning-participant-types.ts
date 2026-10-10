import type { ParticipationResponseStatus } from "@prisma/client";
import type {
  MatchAvailabilityTone,
} from "@/lib/match-squad/match-availability-presentation";

export type PlanningParticipantRole =
  | "TRAINER"
  | "PLAYER"
  | "STAFF"
  | "TEAM"
  | "CLUB"
  | "INVITEE"
  | "OTHER";

export type PlanningParticipantRow = {
  id: string;
  displayName: string;
  role: PlanningParticipantRole;
  roleLabel?: string;
  avatarUrl?: string | null;
  participationStatus?: ParticipationResponseStatus | null;
  participationStatusLabel?: string | null;
  participationStatusTone?: MatchAvailabilityTone | null;
  participationStatusIcon?: "check" | "x" | "help" | "circle" | null;
  subLabel?: string | null;
};

export type PlanningParticipantsPresentation = {
  people: PlanningParticipantRow[];
  teams?: PlanningParticipantRow[];
  emptyStateKey?: "none" | "unsupported" | "noTeamSeason" | "noAudience" | "notFound";
  footnoteKey?: string;
};
