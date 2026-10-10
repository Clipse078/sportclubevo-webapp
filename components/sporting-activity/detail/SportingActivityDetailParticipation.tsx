"use client";

import { useCallback, useState, useTransition } from "react";
import ParticipationResponseChoiceButtons from "@/components/participation/ParticipationResponseChoiceButtons";
import type { SportingActivityDetailParticipation } from "@/lib/sporting-activity-detail/types";
import { submitSportingActivityDetailParticipation } from "@/app/(admin)/dashboard/activity/sporting-activity-detail-actions";
import {
  getParticipationResponseButtonLabel,
  type MatchParticipationResponseChoice,
} from "@/lib/participation/match-participation-response-labels";

const STATUS_LABEL: Record<SportingActivityDetailParticipation["status"], string> = {
  OPEN: "Offen",
  YES: "Dabei",
  NO: "Nicht dabei",
  MAYBE: "Vielleicht",
};

function readonlyStatusLabel(participation: SportingActivityDetailParticipation): string {
  if (participation.eventKind === "MATCH") {
    if (participation.status === "YES") return "Verfügbar";
    if (participation.status === "NO") return "Nicht verfügbar";
    if (participation.status === "MAYBE") return "Unsicher";
    return "Offen";
  }
  return STATUS_LABEL[participation.status];
}

export function SportingActivityDetailParticipationBlock({
  participation,
  onUpdated,
}: {
  participation: SportingActivityDetailParticipation;
  onUpdated?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(participation.status);

  const allowed =
    participation.allowedResponses ??
    (participation.eventKind === "MATCH" ? (["YES", "NO", "MAYBE"] as const) : (["YES", "NO"] as const));

  const submit = useCallback(
    (status: MatchParticipationResponseChoice) => {
      if (!participation.canRespond || isPending) {
        return;
      }
      setErrorMessage(null);
      startTransition(async () => {
        const result = await submitSportingActivityDetailParticipation({ participation, status });
        if (result.ok) {
          setLocalStatus(status);
          onUpdated?.();
          return;
        }
        setErrorMessage(result.message);
      });
    },
    [isPending, onUpdated, participation],
  );

  if (!participation.canRespond) {
    return (
      <p className="text-[0.875rem] text-[var(--foreground)]" data-testid="activity-detail-participation-readonly">
        {readonlyStatusLabel({ ...participation, status: localStatus })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="activity-detail-participation">
      <ParticipationResponseChoiceButtons
        eventKind={participation.eventKind}
        allowedResponses={allowed}
        currentStatus={localStatus === "OPEN" ? undefined : localStatus}
        disabled={isPending}
        onSelect={submit}
        testIdPrefix="activity-detail-participation"
      />
      {localStatus !== "OPEN" ? (
        <p className="text-[0.75rem] text-[var(--muted)]">
          Aktuell:{" "}
          {participation.eventKind === "MATCH"
            ? getParticipationResponseButtonLabel({
                eventKind: "MATCH",
                status: localStatus as MatchParticipationResponseChoice,
              })
            : STATUS_LABEL[localStatus]}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-[0.75rem] text-[var(--destructive)]" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
