import type { EventType } from "@prisma/client";
import { getDayWindow, formatIsoDay } from "@/lib/planner/date-utils";
import {
  presentTaskDeadline,
  startOfLocalDay,
} from "@/lib/tasks/management-deadline";
import { formatTime, type TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { PersonalCalendarItem } from "./types";

export type PersonalAgendaDayGroup = "overdue" | "today" | "tomorrow";

export type PersonalAgendaItem = {
  key: string;
  sortAt: Date;
  timeLabel: string;
  typeLabel: string;
  eventType?: EventType | "MEETING";
  title: string;
  subtitle?: string;
  href?: string;
  dayGroup: PersonalAgendaDayGroup;
  sourceType: PersonalCalendarItem["sourceType"];
  isOverdue?: boolean;
  ariaLabel: string;
};

function resolveAgendaDayGroup(
  sortAt: Date,
  todayWindow: { start: Date; end: Date },
  tomorrowWindow: { start: Date; end: Date },
  isOverdue: boolean,
): PersonalAgendaDayGroup | null {
  if (isOverdue) return "overdue";
  const ts = sortAt.getTime();
  if (ts >= todayWindow.start.getTime() && ts <= todayWindow.end.getTime()) {
    return "today";
  }
  if (ts >= tomorrowWindow.start.getTime() && ts <= tomorrowWindow.end.getTime()) {
    return "tomorrow";
  }
  return null;
}

export function mapPersonalCalendarItemsToAgendaItems(input: {
  items: PersonalCalendarItem[];
  fmtCfg: TenantFormatConfig;
  timeZone: string;
  locale?: string;
  now?: Date;
}): PersonalAgendaItem[] {
  const now = input.now ?? new Date();
  const todayWindow = getDayWindow(formatIsoDay(now));
  const tomorrowDay = getDayWindow(
    formatIsoDay(new Date(todayWindow.end.getTime() + 24 * 60 * 60 * 1000)),
  );
  const todayStartLocal = startOfLocalDay(now, input.timeZone);

  const agenda: PersonalAgendaItem[] = [];

  for (const item of input.items) {
    let isOverdue = false;
    let taskPresentation: ReturnType<typeof presentTaskDeadline> | null = null;
    if (item.sourceType === "TASK" && item.taskStatus) {
      taskPresentation = presentTaskDeadline({
        dueAt: item.startAt.toISOString(),
        status: item.taskStatus,
        now,
        locale: input.locale ?? input.fmtCfg.locale ?? "de-CH",
        timeZone: input.timeZone,
      });
      isOverdue = taskPresentation.kind === "OVERDUE";
    } else if (item.startAt.getTime() < todayStartLocal.getTime()) {
      isOverdue = false;
    }

    const dayGroup = resolveAgendaDayGroup(
      item.startAt,
      todayWindow,
      tomorrowDay,
      isOverdue,
    );
    if (!dayGroup) continue;

    const timeLabel =
      item.sourceType === "TASK" && taskPresentation
        ? isOverdue
          ? "Überfällig"
          : taskPresentation.label
        : formatTime(item.startAt, input.fmtCfg);

    agenda.push({
      key: item.id,
      sortAt: item.startAt,
      timeLabel,
      typeLabel: item.typeLabel,
      eventType: item.eventType,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      dayGroup,
      sourceType: item.sourceType,
      isOverdue: isOverdue || undefined,
      ariaLabel: item.ariaLabel,
    });
  }

  return agenda;
}

export function groupPersonalAgendaItems(
  items: PersonalAgendaItem[],
): {
  overdue: PersonalAgendaItem[];
  today: PersonalAgendaItem[];
  tomorrow: PersonalAgendaItem[];
} {
  return {
    overdue: items.filter((item) => item.dayGroup === "overdue"),
    today: items.filter((item) => item.dayGroup === "today"),
    tomorrow: items.filter((item) => item.dayGroup === "tomorrow"),
  };
}
