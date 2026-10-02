"use client";

import { useCallback, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import type { SportingActivityDetailParticipation } from "@/lib/sporting-activity-detail/types";
import { submitSportingActivityDetailParticipation } from "@/app/(admin)/dashboard/activity/sporting-activity-detail-actions";

const STATUS_LABEL: Record<SportingActivityDetailParticipation["status"], string> = {
  OPEN: "Offen",
  YES: "Dabei",
  NO: "Nicht dabei",
  MAYBE: "Vielleicht",
};

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

  const submit = useCallback(
    (status: "YES" | "NO") => {
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
        {STATUS_LABEL[localStatus]}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="activity-detail-participation">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("YES")}
          className={cn(
            "inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-[0.875rem] font-medium",
            "border-[var(--border)] bg-[var(--surface)]",
            localStatus === "YES" && "border-[var(--primary)]/50 bg-[var(--primary)]/10",
          )}
          aria-label="Dabei"
          data-testid="activity-detail-participation-yes"
        >
          Dabei
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("NO")}
          className={cn(
            "inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-[0.875rem] font-medium",
            "border-[var(--border)] bg-[var(--surface)]",
            localStatus === "NO" && "border-[var(--text-2)] bg-[var(--surface-2)]",
          )}
          aria-label="Abwesend"
          data-testid="activity-detail-participation-no"
        >
          Abwesend
        </button>
      </div>
      {errorMessage ? (
        <p className="text-[0.75rem] text-[var(--destructive)]" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
