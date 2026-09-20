/**
 * AUFGABEN-05-UI — user-facing presentation mapping (no domain changes).
 */

import { TaskStatus } from "@prisma/client";
import { presentTaskDeadline } from "@/lib/tasks/management-deadline";
import { formatTime, type TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { PersonalAction, PersonalActionSourceType } from "./types";

export const PERSONAL_ACTION_INBOX_DEFAULT_LIMIT = 50;

export type PersonalActionSourceFilter = "all" | "tasks" | "attendance";

/** Inline RSVP controls — only YES/NO in Meine Aufgaben (see AUFGABEN-05-PARTICIPATION). */
export type PersonalActionInlineParticipation = {
  personalActionId: string;
  personId: string;
  subjectDisplayName?: string;
  teamSeasonId: string;
  eventKind: "TRAINING" | "MATCH" | "TOURNAMENT";
  trainingSessionId?: string;
  eventId?: string;
};

export type PersonalActionListItem = {
  id: string;
  sourceType: PersonalActionSourceType;
  sourceLabel: string;
  title: string;
  subtitle: string | null;
  metaLine: string | null;
  href: string | null;
  emphasis: "calm" | "attention" | "urgent";
  inlineParticipationReady: boolean;
  inlineParticipation?: PersonalActionInlineParticipation;
};

function formatEventStartContext(iso: string, cfg: TenantFormatConfig): string {
  const date = new Date(iso);
  const locale = cfg.locale ?? "de-CH";
  const timeZone = cfg.timezone ?? "Europe/Zurich";

  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone,
  }).format(date);

  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone,
  }).format(date);

  const month = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone,
  }).format(date);

  return `${weekday}, ${day}. ${month} · ${formatTime(date, cfg)}`;
}

function attendanceActionTitle(action: PersonalAction): string {
  const name = action.subject?.displayName?.trim();
  if (name) {
    return `Teilnahme für ${name} bestätigen`;
  }
  return "Teilnahme bestätigen";
}

function attendanceSubtitle(action: PersonalAction): string {
  const team = action.context?.teamDisplayName?.trim();
  const eventTitle = action.context?.eventTitle?.trim() ?? action.title?.trim();
  if (team && eventTitle) {
    return `${eventTitle} · ${team}`;
  }
  return action.subtitle?.trim() ?? eventTitle ?? team ?? null;
}

export function mapPersonalActionToListItem(
  action: PersonalAction,
  cfg: TenantFormatConfig,
  locale: string,
  timeZone: string,
): PersonalActionListItem {
  if (action.sourceType === "ATTENDANCE_RESPONSE") {
    const eventStart = action.context?.eventStartAt;
    const participation = action.inlineActions?.participation;
    const inlineParticipation: PersonalActionInlineParticipation | undefined =
      participation && action.subject?.personId
        ? {
            personalActionId: action.id,
            personId: action.subject.personId,
            subjectDisplayName: action.subject.displayName,
            teamSeasonId: participation.teamSeasonId,
            eventKind: participation.eventKind,
            trainingSessionId: participation.trainingSessionId,
            eventId: participation.eventId,
          }
        : undefined;

    const deadline = presentTaskDeadline({
      dueAt: action.dueAt,
      status: TaskStatus.OPEN,
      locale,
      timeZone,
    });

    let metaLine: string | null = null;
    if (action.dueAt) {
      if (deadline.kind === "OVERDUE") {
        metaLine = `Überfällig · Antwortfrist: ${deadline.label.replace(/^Fällig · /, "")}`;
      } else if (deadline.kind !== "NONE") {
        metaLine = `Antwortfrist: ${deadline.label.replace(/^Fällig · /, "")}`;
      }
    } else if (eventStart) {
      metaLine = formatEventStartContext(eventStart, cfg);
    }

    return {
      id: action.id,
      sourceType: action.sourceType,
      sourceLabel: "Teilnahme",
      title: attendanceActionTitle(action),
      subtitle: attendanceSubtitle(action),
      metaLine,
      href: action.href,
      emphasis: action.dueAt ? deadline.emphasis : "calm",
      inlineParticipationReady: Boolean(inlineParticipation),
      inlineParticipation,
    };
  }

  const deadline = presentTaskDeadline({
    dueAt: action.dueAt,
    status: TaskStatus.OPEN,
    locale,
    timeZone,
  });

  let metaLine: string | null = null;
  if (deadline.kind === "OVERDUE") {
    metaLine = `Überfällig · ${deadline.label}`;
  } else if (deadline.kind !== "NONE") {
    metaLine = deadline.label;
  }

  return {
    id: action.id,
    sourceType: action.sourceType,
    sourceLabel: "Aufgabe",
    title: action.title,
    subtitle: action.subtitle?.trim() ?? null,
    metaLine,
    href: action.href,
    emphasis: deadline.emphasis,
    inlineParticipationReady: false,
  };
}

/** When the inbox list is bounded, communicate partial display vs total actionable count. */
export function formatPersonalInboxRangeSummary(
  displayedCount: number,
  totalActionableCount: number,
): string | null {
  if (totalActionableCount <= 0 || displayedCount <= 0) {
    return null;
  }
  if (totalActionableCount <= displayedCount) {
    return null;
  }
  return `1–${displayedCount} von ${totalActionableCount}`;
}

export function filterPersonalActionsForInbox(
  actions: PersonalAction[],
  filter: PersonalActionSourceFilter,
): PersonalAction[] {
  if (filter === "tasks") {
    return actions.filter((a) => a.sourceType === "TASK");
  }
  if (filter === "attendance") {
    return actions.filter((a) => a.sourceType === "ATTENDANCE_RESPONSE");
  }
  return actions;
}

export function mapPersonalActionsToPreviewItems(
  actions: PersonalAction[],
  cfg: TenantFormatConfig,
  locale: string,
  timeZone: string,
) {
  return actions.map((action) => {
    const item = mapPersonalActionToListItem(action, cfg, locale, timeZone);
    return {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      metaLine: item.metaLine,
      href: item.href,
      sourceLabel: item.sourceLabel,
    };
  });
}
