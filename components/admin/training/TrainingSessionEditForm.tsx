"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SceTimeField } from "@/components/admin/shared/SceTimeField";
import {
  trainingCenterFieldClass,
  trainingCenterLabelClass,
  trainingCenterSectionTitleClass,
} from "@/components/admin/training/training-center-ui";

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
};

function formatDateLabel(date: string, locale: string, timezone: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone,
  }).format(parsed);
}

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
  timezone,
  locale,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [date, setDate] = useState(effectiveDate);
  const [startTime, setStartTime] = useState(effectiveStartTime);
  const [endTime, setEndTime] = useState(effectiveEndTime);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!startTime || !endTime) {
      toast.danger("Start- und Endzeit sind erforderlich.");
      return;
    }
    if (startTime >= endTime) {
      toast.danger("Die Startzeit muss vor der Endzeit liegen.");
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
        throw new Error(data?.error ?? "Änderungen konnten nicht gespeichert werden.");
      }

      toast.success("Training aktualisiert.");
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Änderungen konnten nicht gespeichert werden.", {
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

  const seriesBaseline = `${formatDateLabel(originalDate, locale, timezone).split(",")[0] ?? originalDate} · ${originalStartTime}–${originalEndTime}`;

  return (
    <div className="space-y-5" data-testid="training-session-edit-form">
      <div>
        <h2 className={trainingCenterSectionTitleClass}>
          <CalendarClock className="mr-2 inline h-4 w-4 text-[var(--muted)]" aria-hidden />
          Datum &amp; Zeit
        </h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Serienstandard: {seriesBaseline} ({timezone})
        </p>
        {isRescheduled ? (
          <p className="mt-1 text-sm text-[var(--muted)]" data-testid="training-session-edit-rescheduled-note">
            Dieses Training wurde für diesen Termin bereits angepasst.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-[var(--muted)]">
          Änderungen gelten nur für dieses Training.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={trainingCenterLabelClass}>Datum</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!canManage || saving}
            data-testid="training-session-edit-date"
            className={trainingCenterFieldClass}
          />
        </label>

        <label className="block">
          <span className={trainingCenterLabelClass}>Beginn</span>
          <SceTimeField
            value={startTime}
            onChange={setStartTime}
            disabled={!canManage || saving}
            testId="training-session-edit-start-time"
            aria-label="Beginn"
          />
        </label>

        <label className="block">
          <span className={trainingCenterLabelClass}>Ende</span>
          <SceTimeField
            value={endTime}
            onChange={setEndTime}
            disabled={!canManage || saving}
            testId="training-session-edit-end-time"
            aria-label="Ende"
          />
        </label>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            data-testid="training-session-edit-save"
            className="fca-button-primary inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Änderungen speichern
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleUseSeriesDefault}
            disabled={saving}
            data-testid="training-session-edit-use-default"
            className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Serienstandard verwenden
          </button>
        </div>
      ) : null}
    </div>
  );
}
