import { getDayWindow, formatIsoDay } from "@/lib/planner/date-utils";
import { addDaysUtc, startOfLocalDay } from "@/lib/tasks/management-deadline";
import {
  getPersonallyRelevantTeamIds,
  resolvePersonalContext,
} from "@/lib/dashboard/personal-context";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { loadPersonalCalendarEntryProjections } from "./calendar-entries";
import { loadTaskDeadlineProjections } from "./task-projections";
import { loadParticipationDeadlineProjections } from "./participation-projections";
import type { PersonalAgendaSourceType, PersonalCalendarItem } from "./types";

export const DASHBOARD_PERSONAL_AGENDA_ITEM_LIMIT = 12;
/** Dashboard overdue surfacing: avoid unbounded historical task scans. */
export const DASHBOARD_OVERDUE_TASK_LOOKBACK_DAYS = 90;

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
  /** Optional pre-resolved permission keys (avoids duplicate resolver calls). */
  permissionKeys?: string[];
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

  if (!args.userId) {
    return { items: [], supported: false, teamIds: [], hasLinkedPerson: false };
  }

  const personalContext = await resolvePersonalContext({
    tenantId: args.tenantId,
    userId: args.userId,
  });

  const teamIds = getPersonallyRelevantTeamIds(personalContext);
  const { hasLinkedPerson } = personalContext;

  const hasMeetingScope = Boolean(args.userId);
  const hasTaskScope = args.tasksViewAuthorized && Boolean(args.userId);
  const hasParticipationScope = hasLinkedPerson && Boolean(args.userId);
  const supported =
    hasLinkedPerson || hasMeetingScope || hasTaskScope || hasParticipationScope;

  if (!supported || !personalContext.hasActiveTenantMembership) {
    return { items: [], supported, teamIds, hasLinkedPerson };
  }

  let permissionKeys = args.permissionKeys;
  if (!permissionKeys) {
    const { platform, tenant } = await getRequestEffectivePermissions(
      args.userId,
      args.tenantId,
    );
    permissionKeys = [...platform, ...tenant];
  }

  const actor = {
    userId: args.userId,
    tenantId: args.tenantId,
    permissionKeys,
  };

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

  const [calendarEntries, windowTasks, overdueTasks, participationDeadlines] =
    await Promise.all([
      loadPersonalCalendarEntryProjections({
        tenantId: args.tenantId,
        userId: args.userId,
        personalContext,
        actor,
        timeZone: args.timeZone,
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
            rangeStart: addDaysUtc(
              startOfLocalDay(now, args.timeZone),
              -DASHBOARD_OVERDUE_TASK_LOOKBACK_DAYS,
            ),
            rangeEnd: overdueRangeEnd,
            tasksViewAuthorized: args.tasksViewAuthorized,
          })
        : Promise.resolve([]),
      hasParticipationScope
        ? loadParticipationDeadlineProjections({
            tenantId: args.tenantId,
            userId: args.userId,
            rangeStart,
            rangeEnd,
            now,
          })
        : Promise.resolve([]),
    ]);

  const overdueIds = new Set(overdueTasks.map((t) => t.id));
  const merged = sortItemsChronologically([
    ...calendarEntries,
    ...windowTasks,
    ...participationDeadlines,
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
