"use client";
import { PeopleSceIcon, MemberSceIcon, RolesAccessSceIcon, OrgUnitSceIcon, WebsiteSceIcon, CommunicationSceIcon, SeasonSceIcon, FacilitySceIcon, NewsSceIcon, TasksSceIcon, NotificationsSceIcon, RequirementsSceIcon, DocumentsSceIcon } from "@/components/icons/domain-sce-icon-components";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import { WeekplannerMatchIdentityCard } from "@/components/admin/planner/WeekplannerMatchIdentityCard";
import { ActivityTypePill } from "@/components/sporting-activity/ActivityTypePill";
import { ActivityContextBadge } from "@/components/sporting-activity/ActivityContextBadge";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import {
  formatLocalDateLong,
  isoToLocalDate,
  isoToLocalTime,
} from "@/lib/weekplanner/weekplanner-editor-time";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";

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

function resolveWeekplannerIdentityLabels(item: WeekplannerItem): {
  activityKind?: SportingActivityKind;
  typeLabel: string;
  contextLabel?: string;
} {
  switch (item.type) {
    case "TRAINING":
      return { activityKind: "TRAINING", typeLabel: "TRAINING" };
    case "MATCH":
      return {
        activityKind: "MATCH",
        typeLabel: "SPIEL",
        contextLabel: "Eigener Verein",
      };
    case "TOURNAMENT":
      return {
        activityKind: "TOURNAMENT",
        typeLabel: "TURNIER",
        contextLabel: "Eigener Verein",
      };
    case "VERANSTALTUNG":
      return { typeLabel: "VERANSTALTUNG" };
  }
}

export function WeekplannerActivityIdentityCard({
  item,
  timezone,
}: {
  item: WeekplannerItem;
  timezone: string;
}) {
  const identity = resolveWeekplannerIdentityLabels(item);
  const dateLabel = formatLocalDateLong(item.canonicalStartAt, timezone);
  const timeLabel =
    formatSportingActivityTimeRange({
      startLabel: isoToLocalTime(item.canonicalStartAt, timezone),
      endLabel: isoToLocalTime(item.canonicalEndAt, timezone),
    }) ?? isoToLocalTime(item.canonicalStartAt, timezone);
  const scheduleSummary = `${dateLabel} · ${timeLabel}`;

  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
      data-testid="weekplanner-activity-identity"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {identity.activityKind ? (
          <ActivityTypePill activityKind={identity.activityKind} label={identity.typeLabel} />
        ) : (
          <span className="inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--text-2)]">
            {identity.typeLabel}
          </span>
        )}
        {identity.contextLabel ? (
          <ActivityContextBadge>{identity.contextLabel}</ActivityContextBadge>
        ) : null}
      </div>

      {item.type === "MATCH" ? (
        <WeekplannerMatchIdentityCard home={item.homeSide} away={item.awaySide} />
      ) : (
        <p className="text-base font-semibold text-[var(--foreground)]">{item.title}</p>
      )}

      {item.type === "TRAINING" && item.teamNames[0] && item.teamNames[0] !== item.title && (
        <p className="text-sm text-[var(--text-2)]">{item.teamNames[0]}</p>
      )}

      <p className="text-sm text-[var(--text-2)]" data-testid="weekplanner-activity-identity-schedule">
        {scheduleSummary}
      </p>
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
