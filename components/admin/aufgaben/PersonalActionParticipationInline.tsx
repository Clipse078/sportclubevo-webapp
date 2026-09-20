"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { PersonalActionInlineParticipation } from "@/lib/personal-actions/presentation";
import { respondToPersonalParticipationAction } from "@/app/(admin)/dashboard/aufgaben/personal-participation-actions";

type Props = {
  participation: PersonalActionInlineParticipation;
};

type PendingStatus = "YES" | "NO" | null;

export default function PersonalActionParticipationInline({ participation }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<PendingStatus>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subject = participation.subjectDisplayName?.trim();
  const nameSuffix = subject ? ` für ${subject}` : "";

  const submit = useCallback(
    (status: "YES" | "NO") => {
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

  const busy = isPending;

  return (
    <div
      className="mt-2 flex flex-col gap-1.5"
      data-testid="personal-action-inline-participation"
      aria-busy={busy || undefined}
    >
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("YES")}
          className={cn(
            "inline-flex items-center rounded-md border px-2.5 py-1 text-[0.8125rem] font-medium transition-colors",
            "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
            "hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5",
            "disabled:cursor-not-allowed disabled:opacity-60",
            pendingStatus === "YES" && "border-[var(--primary)]/50 bg-[var(--primary)]/10",
          )}
          aria-label={`Dabei${nameSuffix}`}
          data-testid="personal-participation-yes"
        >
          {pendingStatus === "YES" && busy ? "Wird gespeichert…" : "Dabei"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("NO")}
          className={cn(
            "inline-flex items-center rounded-md border px-2.5 py-1 text-[0.8125rem] font-medium transition-colors",
            "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
            "hover:border-[var(--border)] hover:bg-[var(--surface-2)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            pendingStatus === "NO" && "border-[var(--text-2)] bg-[var(--surface-2)]",
          )}
          aria-label={`Nicht dabei${nameSuffix}`}
          data-testid="personal-participation-no"
        >
          {pendingStatus === "NO" && busy ? "Wird gespeichert…" : "Nicht dabei"}
        </button>
      </div>
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
