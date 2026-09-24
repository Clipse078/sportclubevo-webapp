"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import {
  TRAINING_FORM_COMPACT_TIME_INPUT_CLASS,
  TRAINING_FORM_TIME_FIELD_WIDTH_CLASS,
  TRAINING_SESSION_EDIT_DATE_INPUT_CLASS,
  TRAINING_SESSION_EDIT_DATETIME_GRID_CLASS,
} from "@/components/admin/training/form/training-form-layout";
import { cn } from "@/lib/cn";

type Props = {
  sessionId: string;
  canManage: boolean;
  isRescheduled: boolean;
  effectiveDate: string;
  effectiveStartTime: string;
  effectiveEndTime: string;
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  timezone: string;
  locale: string;
  seriesStandardLine: string;
};

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
    <div className="space-y-3" data-testid="training-session-edit-form">
      <div className="space-y-0.5">
        <h2
          id="training-session-edit-datetime-heading"
          className="text-sm font-semibold tracking-tight text-[var(--foreground)]"
        >
          {t("dateTimeHeading")}
        </h2>
      </div>

      <div
        className={TRAINING_SESSION_EDIT_DATETIME_GRID_CLASS}
        data-testid="training-session-edit-datetime-fields"
      >
        <label className="block min-w-0 space-y-1">
          <span className="text-xs font-medium text-[var(--text-2)]">{t("fieldDate")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!canManage || saving}
            data-testid="training-session-edit-date"
            className={TRAINING_SESSION_EDIT_DATE_INPUT_CLASS}
          />
        </label>

        <label className={cn("block min-w-0 space-y-1", TRAINING_FORM_TIME_FIELD_WIDTH_CLASS)}>
          <span className="text-xs font-medium text-[var(--text-2)]">{t("fieldStart")}</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={!canManage || saving}
            data-testid="training-session-edit-start-time"
            className={cn(TRAINING_FORM_COMPACT_TIME_INPUT_CLASS, "h-8 disabled:cursor-not-allowed")}
          />
        </label>

        <label className={cn("block min-w-0 space-y-1", TRAINING_FORM_TIME_FIELD_WIDTH_CLASS)}>
          <span className="text-xs font-medium text-[var(--text-2)]">{t("fieldEnd")}</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!canManage || saving}
            data-testid="training-session-edit-end-time"
            className={cn(TRAINING_FORM_COMPACT_TIME_INPUT_CLASS, "h-8 disabled:cursor-not-allowed")}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
        <span data-testid="training-session-edit-series-standard">
          <span className="text-[var(--muted)]">{t("seriesStandard")}:</span> {seriesStandardLine}
        </span>
        {isRescheduled ? (
          <span
            className="inline-flex h-5 items-center rounded-full border border-[var(--blue)]/30 bg-[var(--blue)]/10 px-2 text-[0.65rem] font-medium text-[var(--blue)]"
            data-testid="training-session-edit-rescheduled-badge"
          >
            Abweichend
          </span>
        ) : null}
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            data-testid="training-session-edit-save"
            className="fca-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {t("saving")}
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {t("saveChanges")}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleUseSeriesDefault}
            disabled={saving}
            data-testid="training-session-edit-use-default"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("useSeriesDefault")}
          </button>
        </div>
      )}
    </div>
  );
}
