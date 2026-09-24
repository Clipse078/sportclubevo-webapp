"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import {
  TRAINING_FORM_COMPACT_TIME_INPUT_CLASS,
  TRAINING_FORM_TIME_FIELD_WIDTH_CLASS,
} from "@/components/admin/training/form/training-form-layout";
import { cn } from "@/lib/cn";

type Props = {
  sessionId: string;
  canManage: boolean;
  isRescheduled: boolean;
  /** Effective (currently displayed/used) values — reflect any existing override. */
  effectiveDate: string;
  effectiveStartTime: string;
  effectiveEndTime: string;
  /** Canonical TrainingSeries-derived defaults, shown as reference. */
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  timezone: string;
  locale: string;
  seriesStandardLine: string;
};

/**
 * TRAININGCENTER-02 — occurrence-level date/time editor for ONE canonical
 * TrainingSession. Submits the full effective schedule to
 * PATCH /api/training-sessions/[sessionId]/reschedule, which sets (or, when
 * it matches the series default exactly, clears) this occurrence's
 * override. The parent TrainingSeries recurrence is never touched.
 */
export default function TrainingSessionEditForm({
  sessionId,
  canManage,
  isRescheduled,
  effectiveDate,
  effectiveStartTime,
  effectiveEndTime,
  originalDate,
  originalStartTime,
  originalEndTime,
  seriesStandardLine,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("TrainingCenter.sessionEdit");

  const [date, setDate] = useState(effectiveDate);
  const [startTime, setStartTime] = useState(effectiveStartTime);
  const [endTime, setEndTime] = useState(effectiveEndTime);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!startTime || !endTime) {
      toast.danger(t("validationTimesRequired"));
      return;
    }
    if (startTime >= endTime) {
      toast.danger(t("validationStartBeforeEnd"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/training-sessions/${sessionId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startsAt: startTime, endsAt: endTime }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? t("saveError"));
      }

      toast.success(t("saveSuccess"));
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : t("saveError"), {
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleUseSeriesDefault() {
    setDate(originalDate);
    setStartTime(originalStartTime);
    setEndTime(originalEndTime);
  }

  return (
    <div className="space-y-5" data-testid="training-session-edit-form">
      <div>
        <h2
          id="training-session-edit-datetime-heading"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--foreground)]"
        >
          <CalendarClock size={16} className="text-[var(--muted)]" aria-hidden="true" />
          {t("dateTimeHeading")}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-2)]" data-testid="training-session-edit-series-standard">
          {t("seriesStandard")}: {seriesStandardLine}
        </p>
        {isRescheduled && (
          <p
            className="mt-1 text-xs font-medium text-[var(--blue)]"
            data-testid="training-session-edit-rescheduled-note"
          >
            {t("rescheduledNote")}
          </p>
        )}
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="block min-w-0 space-y-1.5">
          <span className="text-xs font-medium text-[var(--text-2)]">{t("fieldDate")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!canManage || saving}
            data-testid="training-session-edit-date"
            className="fca-input h-9 w-full px-3 text-sm disabled:cursor-not-allowed"
          />
        </label>

        <label className={cn("block min-w-0 space-y-1.5", TRAINING_FORM_TIME_FIELD_WIDTH_CLASS)}>
          <span className="text-xs font-medium text-[var(--text-2)]">{t("fieldStart")}</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={!canManage || saving}
            data-testid="training-session-edit-start-time"
            className={cn(TRAINING_FORM_COMPACT_TIME_INPUT_CLASS, "h-9 disabled:cursor-not-allowed")}
          />
        </label>

        <label className={cn("block min-w-0 space-y-1.5", TRAINING_FORM_TIME_FIELD_WIDTH_CLASS)}>
          <span className="text-xs font-medium text-[var(--text-2)]">{t("fieldEnd")}</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!canManage || saving}
            data-testid="training-session-edit-end-time"
            className={cn(TRAINING_FORM_COMPACT_TIME_INPUT_CLASS, "h-9 disabled:cursor-not-allowed")}
          />
        </label>
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            data-testid="training-session-edit-save"
            className="fca-button-primary"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t("saving")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {t("saveChanges")}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleUseSeriesDefault}
            disabled={saving}
            data-testid="training-session-edit-use-default"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("useSeriesDefault")}
          </button>
        </div>
      )}
    </div>
  );
}
