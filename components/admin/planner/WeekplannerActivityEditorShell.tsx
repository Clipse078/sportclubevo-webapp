"use client";

import { AlertCircle, Calendar, Check, Clock, Dumbbell, Loader2, Shield, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import { WeekplannerMatchIdentityCard } from "@/components/admin/planner/WeekplannerMatchIdentityCard";
import {
  formatLocalDateLong,
  isoToLocalDate,
  isoToLocalTime,
} from "@/lib/weekplanner/weekplanner-editor-time";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export const WOCHENPLANNER_EDITOR_SHEET_TITLE = "Planung bearbeiten";

export function WeekplannerSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{children}</p>
  );
}

export function WeekplannerEditorError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

type FooterProps = {
  saving: boolean;
  hasChanges: boolean;
  canSave: boolean;
  onSave: () => void;
  onClose: () => void;
  saveTestId?: string;
};

export function WeekplannerEditorFooter({
  saving,
  hasChanges,
  canSave,
  onSave,
  onClose,
  saveTestId = "weekplanner-canonical-save",
}: FooterProps) {
  return (
    <>
      <button type="button" onClick={onClose} className="fca-button-secondary text-sm">
        Abbrechen
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !hasChanges || !canSave}
        className="fca-button-primary text-sm"
        data-testid={saveTestId}
      >
        {saving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Speichern…
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" />
            Planung übernehmen
          </>
        )}
      </button>
    </>
  );
}

export function WeekplannerActivityIdentityCard({
  item,
  timezone,
}: {
  item: WeekplannerItem;
  timezone: string;
}) {
  const typeConfig = {
    TRAINING: { icon: Dumbbell, label: "Training", badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    MATCH: { icon: Shield, label: "Heimspiel", badgeClass: "border-blue-200 bg-blue-50 text-blue-700" },
    TOURNAMENT: { icon: Trophy, label: "Turnier", badgeClass: "border-amber-200 bg-amber-50 text-amber-700" },
    VERANSTALTUNG: { icon: Calendar, label: "Veranstaltung", badgeClass: "border-violet-200 bg-violet-50 text-violet-700" },
  }[item.type];

  const Icon = typeConfig.icon;
  const dateLabel = formatLocalDateLong(item.canonicalStartAt, timezone);
  const timeLabel = `${isoToLocalTime(item.canonicalStartAt, timezone)} – ${isoToLocalTime(item.canonicalEndAt, timezone)}`;

  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
      data-testid="weekplanner-activity-identity"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            typeConfig.badgeClass,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {typeConfig.label}
        </span>
      </div>

      {item.type === "MATCH" ? (
        <WeekplannerMatchIdentityCard home={item.homeSide} away={item.awaySide} />
      ) : (
        <p className="text-base font-semibold text-[var(--foreground)]">{item.title}</p>
      )}

      {item.type === "TRAINING" && item.teamNames[0] && item.teamNames[0] !== item.title && (
        <p className="text-sm text-[var(--text-2)]">{item.teamNames[0]}</p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-2)]">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          {dateLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

type DateTimeFieldProps = {
  formId: string;
  date: string;
  startTime: string;
  endTime: string;
  onDateChange: (value: string) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  dateReadOnly?: boolean;
  startReadOnly?: boolean;
  endReadOnly?: boolean;
  startTestId?: string;
  endTestId?: string;
};

export function WeekplannerDateTimeFields({
  formId,
  date,
  startTime,
  endTime,
  onDateChange,
  onStartChange,
  onEndChange,
  dateReadOnly = false,
  startReadOnly = false,
  endReadOnly = false,
  startTestId,
  endTestId,
}: DateTimeFieldProps) {
  return (
    <div className="space-y-2" data-testid="weekplanner-datetime-section">
      <WeekplannerSectionLabel>Datum &amp; Uhrzeit</WeekplannerSectionLabel>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1" htmlFor={`${formId}-date`}>
          <span className="fca-label">Datum</span>
          <input
            id={`${formId}-date`}
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            readOnly={dateReadOnly}
            className={cn("fca-input", dateReadOnly && "bg-[var(--surface-2)]")}
          />
        </label>
        <label className="block space-y-1" htmlFor={`${formId}-start`}>
          <span className="fca-label">Beginn</span>
          <input
            id={`${formId}-start`}
            type="time"
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
            readOnly={startReadOnly}
            className={cn("fca-input", startReadOnly && "bg-[var(--surface-2)]")}
            data-testid={startTestId}
          />
        </label>
        <label className="block space-y-1" htmlFor={`${formId}-end`}>
          <span className="fca-label">Ende</span>
          <input
            id={`${formId}-end`}
            type="time"
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            readOnly={endReadOnly}
            className={cn("fca-input", endReadOnly && "bg-[var(--surface-2)]")}
            data-testid={endTestId}
          />
        </label>
      </div>
    </div>
  );
}

export function WeekplannerActivityEditorSheet({
  description,
  onClose,
  footer,
  children,
}: {
  description?: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Sheet
      open
      onClose={onClose}
      title={WOCHENPLANNER_EDITOR_SHEET_TITLE}
      description={description}
      footer={footer}
    >
      {children}
    </Sheet>
  );
}

/** Convenience for editors that need local date from canonical start. */
export function initialEditorDate(item: WeekplannerItem, timezone: string): string {
  return isoToLocalDate(item.canonicalStartAt, timezone);
}
