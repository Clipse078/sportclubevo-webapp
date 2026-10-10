"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ParticipationResponseChoiceButtons from "@/components/participation/ParticipationResponseChoiceButtons";
import type { PersonalActionInlineParticipation } from "@/lib/personal-actions/presentation";
import { respondToPersonalParticipationAction } from "@/app/(admin)/dashboard/aufgaben/personal-participation-actions";
import type { MatchParticipationResponseChoice } from "@/lib/participation/match-participation-response-labels";

type Props = {
  participation: PersonalActionInlineParticipation;
};

export default function PersonalActionParticipationInline({ participation }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<MatchParticipationResponseChoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subject = participation.subjectDisplayName?.trim();
  const nameSuffix = subject ? ` für ${subject}` : "";

  const submit = useCallback(
    (status: MatchParticipationResponseChoice) => {
      if (isPending) {
        return;
      }
      setErrorMessage(null);
      setPendingStatus(status);

      startTransition(async () => {
        const result = await respondToPersonalParticipationAction({
          personalActionId: participation.personalActionId,
          personId: participation.personId,
          teamSeasonId: participation.teamSeasonId,
          eventKind: participation.eventKind,
          trainingSessionId: participation.trainingSessionId,
          eventId: participation.eventId,
          status,
        });

        if (result.ok) {
          router.refresh();
          return;
        }

        setPendingStatus(null);
        setErrorMessage(result.message);
      });
    },
    [isPending, participation, router],
  );

  return (
    <div
      className="mt-2 flex flex-col gap-1.5"
      data-testid="personal-action-inline-participation"
      aria-busy={isPending || undefined}
    >
      <ParticipationResponseChoiceButtons
        eventKind={participation.eventKind}
        allowedResponses={participation.allowedResponses}
        disabled={isPending}
        pendingStatus={pendingStatus}
        onSelect={submit}
        nameSuffix={nameSuffix}
        testIdPrefix="personal-participation"
      />
      {errorMessage ? (
        <p
          className="text-[0.75rem] text-[var(--destructive)]"
          role="alert"
          data-testid="personal-participation-error"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
