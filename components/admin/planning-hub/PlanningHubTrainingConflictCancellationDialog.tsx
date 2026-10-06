"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import { weekplannerTimingDetail } from "@/lib/planning-hub/item-presenters";
import type { SameTeamTrainingCancellationOffer } from "@/lib/planning-hub/same-team-training-cancellation";
import PlanningHubManipulationModalShell from "./PlanningHubManipulationModalShell";

type Props = {
  offer: SameTeamTrainingCancellationOffer;
  locale: string;
  timezone: string;
  testId: string;
  onClose: () => void;
  onCancelled?: () => void;
};

function formatOccurrenceDayHeading(startAt: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(startAt);
}

export default function PlanningHubTrainingConflictCancellationDialog({
  offer,
  locale,
  timezone,
  testId,
  onClose,
  onCancelled,
}: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { training, match } = offer;
  const trainingTitle = schedulerDisplayIdentity(training);
  const matchTitle = schedulerDisplayIdentity(match);
  const dayHeading = formatOccurrenceDayHeading(training.startAt, locale, timezone);
  const timeRange = weekplannerTimingDetail(training, locale, timezone);
  const matchTimeRange = weekplannerTimingDetail(match, locale, timezone);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/training-sessions/${training.trainingSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data?.error?.trim() || "Training konnte nicht abgesagt werden.");
        return;
      }
      await fetch("/api/planning-hub/planner-revalidate", { method: "POST" }).catch(() => undefined);
      onCancelled?.();
      router.refresh();
      onClose();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PlanningHubManipulationModalShell
      testId={testId}
      onClose={onClose}
      initialFocusRef={titleRef}
      header={
        <h2 ref={titleRef} tabIndex={-1} className="text-base font-semibold text-[var(--foreground)] outline-none">
          Training absagen?
        </h2>
      }
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving}
            data-testid={`${testId}-confirm`}
            onClick={() => void handleConfirm()}
          >
            {saving ? "Wird abgesagt …" : "Training absagen"}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div>
          <p className="font-semibold text-[var(--foreground)]">{trainingTitle}</p>
          <p className="text-[var(--text-2)]">{dayHeading}</p>
          <p className="tabular-nums text-[var(--text-2)]">{timeRange}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-2)]">Dieses Training überschneidet sich mit:</p>
          <p className="mt-1 font-semibold text-[var(--foreground)]">{matchTitle}</p>
          <p className="tabular-nums text-xs text-[var(--muted)]">{matchTimeRange}</p>
        </div>
        {error ? (
          <p className="text-xs font-medium text-rose-600" data-testid={`${testId}-error`}>
            {error}
          </p>
        ) : null}
      </div>
    </PlanningHubManipulationModalShell>
  );
}
