"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { weekplannerActivityTypeLabel, weekplannerTimingDetail } from "@/lib/planning-hub/item-presenters";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";
import PlanningHubManipulationModalShell from "./PlanningHubManipulationModalShell";

type Props = {
  training: WeekplannerTrainingItem;
  locale: string;
  timezone: string;
  testId: string;
  onClose: () => void;
  onCancelled?: (trainingSessionId: string) => void;
  onRefreshFailed?: (message: string) => void;
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

export default function PlanningHubTrainingActivityCancellationDialog({
  training,
  locale,
  timezone,
  testId,
  onClose,
  onCancelled,
  onRefreshFailed,
}: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trainingTitle = schedulerDisplayIdentity(training);
  const activityTypeLabel = weekplannerActivityTypeLabel(training.type);
  const dayHeading = formatOccurrenceDayHeading(training.startAt, locale, timezone);
  const timeRange = weekplannerTimingDetail(training, locale, timezone);

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

      onCancelled?.(training.trainingSessionId);

      let refreshFailed = false;
      try {
        const revalidateRes = await fetch("/api/planning-hub/planner-revalidate", {
          method: "POST",
        });
        if (!revalidateRes.ok) {
          refreshFailed = true;
        }
      } catch {
        refreshFailed = true;
      }

      try {
        router.refresh();
      } catch {
        refreshFailed = true;
      }

      onClose();

      if (refreshFailed) {
        onRefreshFailed?.(
          "Training wurde abgesagt, aber die Planungsansicht konnte nicht vollständig synchronisiert werden. Bitte Seite neu laden, falls Einträge veraltet wirken.",
        );
      }
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
            Zurück
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
        <div data-testid={`${testId}-identity`}>
          <p className="font-semibold text-[var(--foreground)]">{trainingTitle}</p>
          <p className="text-[var(--text-2)]">{activityTypeLabel}</p>
          <p className="text-[var(--text-2)]">{dayHeading}</p>
          <p className="tabular-nums text-[var(--text-2)]">{timeRange}</p>
        </div>
        <p className="text-xs text-[var(--text-2)]">
          Es wird nur dieses Training abgesagt. Die Trainingsserie bleibt unverändert.
        </p>
        {error ? (
          <p className="text-xs font-medium text-rose-600" data-testid={`${testId}-error`}>
            {error}
          </p>
        ) : null}
      </div>
    </PlanningHubManipulationModalShell>
  );
}
