import { getDayWindow, formatIsoDay } from "@/lib/planner/date-utils";
import { startOfLocalDay } from "@/lib/tasks/management-deadline";
import { resolvePersonalTeamIds } from "./team-scope";
import { loadPersonalCalendarEntryProjections } from "./calendar-entries";
import { loadTaskDeadlineProjections } from "./task-projections";
import type { PersonalAgendaSourceType, PersonalCalendarItem } from "./types";

export const DASHBOARD_PERSONAL_AGENDA_ITEM_LIMIT = 12;

export type LoadPersonalAgendaArgs = {
  tenantId: string;
  userId: string | null | undefined;
  timeZone: string;
  now?: Date;
  /** Inclusive UTC range for calendar mode; dashboard mode derives today+tomorrow. */
  rangeStart?: Date;
  rangeEnd?: Date;
  mode: "dashboard" | "calendar";
  tasksViewAuthorized: boolean;
  /** Dashboard-only: include actionable overdue tasks before the today/tomorrow window. */
  includeOverdueTasks?: boolean;
  limit?: number;
};

export type LoadPersonalAgendaResult = {
  items: PersonalCalendarItem[];
  /** User can use personal agenda (linked person, meetings, and/or tasks). */
  supported: boolean;
  teamIds: string[];
  hasLinkedPerson: boolean;
};

function sortItemsChronologically(items: PersonalCalendarItem[]): PersonalCalendarItem[] {
  return [...items].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.title.localeCompare(b.title),
  );
}

export async function loadPersonalAgenda(
  args: LoadPersonalAgendaArgs,
): Promise<LoadPersonalAgendaResult> {
  const now = args.now ?? new Date();
  const { teamIds, hasLinkedPerson } = await resolvePersonalTeamIds({
    tenantId: args.tenantId,
    userId: args.userId,
  });

  const hasMeetingScope = Boolean(args.userId);
  const hasTaskScope = args.tasksViewAuthorized && Boolean(args.userId);
  const supported =
    hasLinkedPerson || hasMeetingScope || hasTaskScope;

  if (!supported || !args.userId) {
    return { items: [], supported, teamIds, hasLinkedPerson };
  }

  let rangeStart: Date;
  let rangeEnd: Date;
  let overdueRangeEnd: Date | null = null;

  if (args.mode === "dashboard") {
    const todayWindow = getDayWindow(formatIsoDay(now));
    const tomorrowDay = getDayWindow(
      formatIsoDay(new Date(todayWindow.end.getTime() + 24 * 60 * 60 * 1000)),
    );
    rangeStart = todayWindow.start;
    rangeEnd = tomorrowDay.end;
    if (args.includeOverdueTasks) {
      overdueRangeEnd = startOfLocalDay(now, args.timeZone);
      overdueRangeEnd = new Date(overdueRangeEnd.getTime() - 1);
    }
  } else {
    rangeStart = args.rangeStart ?? getDayWindow(formatIsoDay(now)).start;
    rangeEnd = args.rangeEnd ?? getDayWindow(formatIsoDay(now)).end;
  }

  const [calendarEntries, windowTasks, overdueTasks] = await Promise.all([
    loadPersonalCalendarEntryProjections({
      tenantId: args.tenantId,
      userId: args.userId,
      teamIds,
      rangeStart,
      rangeEnd,
    }),
    loadTaskDeadlineProjections({
      tenantId: args.tenantId,
      userId: args.userId,
      rangeStart,
      rangeEnd,
      tasksViewAuthorized: args.tasksViewAuthorized,
    }),
    overdueRangeEnd
      ? loadTaskDeadlineProjections({
          tenantId: args.tenantId,
          userId: args.userId,
          rangeStart: new Date(0),
          rangeEnd: overdueRangeEnd,
          tasksViewAuthorized: args.tasksViewAuthorized,
        })
      : Promise.resolve([]),
  ]);

  const overdueIds = new Set(overdueTasks.map((t) => t.id));
  const merged = sortItemsChronologically([
    ...calendarEntries,
    ...windowTasks,
    ...overdueTasks.filter((t) => !windowTasks.some((w) => w.id === t.id)),
  ]);

  let items = merged;
  if (args.mode === "dashboard") {
    const overdueFirst = [
      ...merged.filter((i) => i.sourceType === "TASK" && overdueIds.has(i.id)),
      ...merged.filter((i) => !(i.sourceType === "TASK" && overdueIds.has(i.id))),
    ];
    items = overdueFirst;
    const cap = args.limit ?? DASHBOARD_PERSONAL_AGENDA_ITEM_LIMIT;
    if (cap > 0) {
      items = items.slice(0, cap);
    }
  }

  return { items, supported, teamIds, hasLinkedPerson };
}

export function filterPersonalCalendarItemsBySource(
  items: PersonalCalendarItem[],
  allowed: PersonalAgendaSourceType[] | "all",
): PersonalCalendarItem[] {
  if (allowed === "all") return items;
  const set = new Set(allowed);
  return items.filter((item) => set.has(item.sourceType));
}
