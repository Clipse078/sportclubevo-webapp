import type {
  PlatformCommunicationPollLifecycle,
  PlatformCommunicationPollMode,
  PlatformCommunicationPollResultsVisibility,
} from "@prisma/client";

export const POLL_MODES = ["SINGLE", "MULTIPLE"] as const satisfies readonly PlatformCommunicationPollMode[];

export const POLL_RESULTS_VISIBILITY = [
  "AFTER_RESPONSE",
  "AFTER_CLOSE",
  "SENDER_ONLY",
] as const satisfies readonly PlatformCommunicationPollResultsVisibility[];

export type PollKind = "POLL" | "DATE_POLL";

export type PollOptionInput =
  | { label: string }
  | { startAt: string; endAt?: string | null };

export type TeamPollOptionDto = {
  id: string;
  sortOrder: number;
  label: string | null;
  startAt: string | null;
  endAt: string | null;
  responseCount: number;
};

export type TeamPollAggregateResultsDto = {
  eligibleRecipientCount: number;
  respondedRecipientCount: number;
  notRespondedCount: number;
  totalSelectionCount: number;
  options: TeamPollOptionDto[];
};

export type TeamPollTimelineDto = {
  pollId: string;
  kind: PollKind;
  mode: PlatformCommunicationPollMode;
  resultsVisibility: PlatformCommunicationPollResultsVisibility;
  lifecycle: PlatformCommunicationPollLifecycle;
  deadlineAt: string | null;
  closedAt: string | null;
  isExpired: boolean;
  isOpen: boolean;
  canRespond: boolean;
  canViewResults: boolean;
  canManage: boolean;
  canSelectWinner: boolean;
  canCreateEvent: boolean;
  selectedOptionId: string | null;
  createdEventId: string | null;
  viewerSelectedOptionIds: string[];
  options: TeamPollOptionDto[];
  results: TeamPollAggregateResultsDto | null;
};

export function isPollMode(value: string): value is PlatformCommunicationPollMode {
  return (POLL_MODES as readonly string[]).includes(value);
}

export function isPollResultsVisibility(
  value: string,
): value is PlatformCommunicationPollResultsVisibility {
  return (POLL_RESULTS_VISIBILITY as readonly string[]).includes(value);
}

export function assertPollKind(value: string): PollKind {
  if (value === "POLL" || value === "DATE_POLL") return value;
  throw new Error("invalid poll kind");
}
