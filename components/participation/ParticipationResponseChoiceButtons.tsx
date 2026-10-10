"use client";

import { cn } from "@/lib/cn";
import {
  getParticipationResponseButtonLabel,
  type MatchParticipationResponseChoice,
} from "@/lib/participation/match-participation-response-labels";

type EventKind = "TRAINING" | "MATCH" | "TOURNAMENT";

type Props = {
  eventKind: EventKind;
  allowedResponses: readonly MatchParticipationResponseChoice[];
  currentStatus?: MatchParticipationResponseChoice | "OPEN" | null;
  disabled?: boolean;
  pendingStatus?: MatchParticipationResponseChoice | null;
  onSelect: (status: MatchParticipationResponseChoice) => void;
  nameSuffix?: string;
  testIdPrefix?: string;
};

export default function ParticipationResponseChoiceButtons({
  eventKind,
  allowedResponses,
  currentStatus,
  disabled,
  pendingStatus,
  onSelect,
  nameSuffix = "",
  testIdPrefix = "participation",
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowedResponses.map((status) => {
        const label = getParticipationResponseButtonLabel({ eventKind, status });
        const isActive = currentStatus === status;
        const isPending = pendingStatus === status;
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(status)}
            className={cn(
              "inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-[0.875rem] font-medium transition-colors",
              "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
              "hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5",
              "disabled:cursor-not-allowed disabled:opacity-60",
              isActive && "border-[var(--primary)]/50 bg-[var(--primary)]/10",
              status === "NO" && isActive && "border-[var(--text-2)] bg-[var(--surface-2)]",
            )}
            aria-label={`${label}${nameSuffix}`}
            aria-pressed={isActive}
            data-testid={`${testIdPrefix}-${status.toLowerCase()}`}
          >
            {isPending && disabled ? "Wird gespeichert…" : label}
          </button>
        );
      })}
    </div>
  );
}
