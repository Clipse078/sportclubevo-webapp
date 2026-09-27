import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PersonalProgrammeMonthGridRange } from "./programme-month-range";
import { resolvePersonalProgrammeMonthGridRange } from "./programme-month-range";
import { loadPersonalProgramme, type LoadPersonalProgrammeResult } from "./load-personal-programme";
import { loadTaskDeadlineProjections } from "./task-projections";
import type { PersonalKalenderSourceFilter } from "./kalender-url";
import {
  normalizePersonalProgrammeItem,
  normalizePersonalTaskCalendarItem,
  normalizedCalendarItemToProgrammeItem,
  normalizedCalendarItemToTaskItem,
} from "./normalize-calendar-item";
import { groupNormalizedCalendarItemsByDay } from "./calendar-item-day-key";
import { sortNormalizedCalendarItems } from "./calendar-item-sort";
import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";
import type { PersonalProgrammeItem } from "./personal-programme-types";
import type { PersonalCalendarItem } from "./types";

export type LoadPersonalCalendarMonthBundleArgs = {
  tenantId: string;
  userId: string | null | undefined;
  timeZone: string;
  now?: Date;
  /** Resolved YYYY-MM month param (after tenant-local defaulting). */
  monthParam: string;
  quelle: PersonalKalenderSourceFilter;
  permissionKeys?: string[];
};

export type PersonalCalendarMonthBundle = {
  month: string;
  timeZone: string;
  gridRange: PersonalProgrammeMonthGridRange;
  items: NormalizedCalendarItem[];
  itemsByDayKey: Record<string, NormalizedCalendarItem[]>;
  programmeItems: PersonalProgrammeItem[];
  taskItems: PersonalCalendarItem[];
  programmeLoad: Pick<
    LoadPersonalProgrammeResult,
    "supported" | "teamIds" | "hasLinkedPerson" | "range"
  >;
  supported: boolean;
};

function legacyProjectionsFromNormalized(items: NormalizedCalendarItem[]): {
  programmeItems: PersonalProgrammeItem[];
  taskItems: PersonalCalendarItem[];
} {
  const programmeItems: PersonalProgrammeItem[] = [];
  const taskItems: PersonalCalendarItem[] = [];
  for (const item of items) {
    if (item.semanticType === "TASK") {
      const task = normalizedCalendarItemToTaskItem(item);
      if (task) taskItems.push(task);
    } else {
      const programme = normalizedCalendarItemToProgrammeItem(item);
      if (programme) programmeItems.push(programme);
    }
  }
  return { programmeItems, taskItems };
}

function recordFromDayGroups(
  groups: Map<string, NormalizedCalendarItem[]>,
): Record<string, NormalizedCalendarItem[]> {
  const out: Record<string, NormalizedCalendarItem[]> = {};
  for (const [key, list] of groups) {
    out[key] = list;
  }
  return out;
}

/**
 * Canonical personal calendar month aggregation for desktop kalender, future mobile,
 * and other RSC consumers. Reuses loadPersonalProgramme + task deadline projections.
 */
export async function loadPersonalCalendarMonthBundle(
  args: LoadPersonalCalendarMonthBundleArgs,
): Promise<PersonalCalendarMonthBundle> {
  const gridRange = resolvePersonalProgrammeMonthGridRange({
    monthParam: args.monthParam,
    timeZone: args.timeZone,
    now: args.now,
  });

  const includeProgramme = args.quelle === "alle" || args.quelle === "termine";
  const includeTasks = args.quelle === "alle" || args.quelle === "aufgaben";

  let permissionKeys = args.permissionKeys;
  if (!permissionKeys && args.userId) {
    const { platform, tenant } = await getRequestEffectivePermissions(
      args.userId,
      args.tenantId,
    );
    permissionKeys = [...platform, ...tenant];
  }
  permissionKeys = permissionKeys ?? [];

  const tasksViewAuthorized = permissionKeys.includes(PERMISSIONS.TASKS_VIEW);

  const programmeLoaded: LoadPersonalProgrammeResult = includeProgramme
    ? await loadPersonalProgramme({
        tenantId: args.tenantId,
        userId: args.userId,
        timeZone: args.timeZone,
        now: args.now,
        from: gridRange.rangeStart,
        to: gridRange.rangeEnd,
        permissionKeys,
      })
    : {
        items: [],
        supported: false,
        teamIds: [],
        hasLinkedPerson: false,
        range: { rangeStart: gridRange.rangeStart, rangeEnd: gridRange.rangeEnd },
      };

  const rawTaskItems =
    includeTasks && args.userId
      ? await loadTaskDeadlineProjections({
          tenantId: args.tenantId,
          userId: args.userId,
          rangeStart: gridRange.rangeStart,
          rangeEnd: gridRange.rangeEnd,
          tasksViewAuthorized,
        })
      : [];

  const normalized = sortNormalizedCalendarItems([
    ...programmeLoaded.items.map(normalizePersonalProgrammeItem),
    ...rawTaskItems.map(normalizePersonalTaskCalendarItem),
  ]);

  const itemsByDayKey = recordFromDayGroups(
    groupNormalizedCalendarItemsByDay(normalized, args.timeZone),
  );

  const { programmeItems, taskItems } = legacyProjectionsFromNormalized(normalized);

  const supported =
    programmeLoaded.supported ||
    programmeLoaded.hasLinkedPerson ||
    (tasksViewAuthorized && Boolean(args.userId));

  return {
    month: gridRange.monthWindow.param,
    timeZone: args.timeZone,
    gridRange,
    items: normalized,
    itemsByDayKey,
    programmeItems,
    taskItems,
    programmeLoad: {
      supported: programmeLoaded.supported,
      teamIds: programmeLoaded.teamIds,
      hasLinkedPerson: programmeLoaded.hasLinkedPerson,
      range: programmeLoaded.range,
    },
    supported,
  };
}
