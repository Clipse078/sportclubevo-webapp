/**
 * Personal-dashboard section data loaders (SCE-PERF-02 / navigation-loading-ux).
 *
 * Suspense boundaries render sections progressively; on the read-model path the
 * shared `readPersonalDashboardCoreCached` request dedupes one core fetch per
 * render (see personal-dashboard-section-status.ts).
 */
import { cache } from "react";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { ActorContext } from "@/lib/visibility/actor-context";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { loadPersonalProgramme } from "@/lib/personal-agenda/load-personal-programme";
import {
  filterProgrammeItemsToRange,
  buildProgrammeFeedGroups,
} from "@/lib/personal-agenda/programme-feed-groups";
import { resolvePersonalProgrammeRange } from "@/lib/personal-agenda/programme-range";
import {
  resolvePersonalProgrammeMonthGridRange,
  shiftMonthParam,
} from "@/lib/calendar/month-grid";
import { formatMonthParam } from "@/lib/personal-agenda/calendar-range";
import { loadDashboardPersonalWork } from "@/lib/dashboard/personal-attention";
import {
  getPersonalCommandCenterData,
  type PersonalCommandCenterData,
} from "@/lib/dashboard/personal-command-center";
import { personalDashboardReadModelEnabled } from "@/lib/dashboard/read-model";

export type PersonalDashboardSectionContext = {
  tenantId: string;
  userId: string;
  actor: Pick<ActorContext, "tenantId" | "userId" | "permissionKeys"> | null;
  fmtCfg: TenantFormatConfig;
  permissionKeys: PermissionKey[];
  calendarMonthParam?: string | null;
};

function mergeProgrammeRanges(
  a: ReturnType<typeof resolvePersonalProgrammeRange>,
  b: { rangeStart: Date; rangeEnd: Date },
) {
  return {
    rangeStart:
      a.rangeStart.getTime() <= b.rangeStart.getTime() ? a.rangeStart : b.rangeStart,
    rangeEnd: a.rangeEnd.getTime() >= b.rangeEnd.getTime() ? a.rangeEnd : b.rangeEnd,
  };
}

export function personalDashboardUsesSharedReadModelCore(): boolean {
  return personalDashboardReadModelEnabled();
}

const readPersonalDashboardCoreCached = cache(
  async (ctx: PersonalDashboardSectionContext): Promise<PersonalCommandCenterData> =>
    getPersonalCommandCenterData({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      actor: ctx.actor,
      fmtCfg: ctx.fmtCfg,
      permissionKeys: ctx.permissionKeys,
      calendarMonthParam: ctx.calendarMonthParam,
    }),
);

export async function loadPersonalDashboardProgrammeSection(
  ctx: PersonalDashboardSectionContext,
) {
  if (personalDashboardReadModelEnabled()) {
    const core = await readPersonalDashboardCoreCached(ctx);
    return {
      groups: core.programmeFeedGroups,
      programmeSupported: core.programmeSupported,
      programmeItems: core.programmeItems,
      monthParam: core.calendarMonthParam,
      navigation: core.calendarNavigation,
    };
  }

  const now = new Date();
  const timeZone = ctx.fmtCfg.timezone ?? "Europe/Zurich";
  const locale = ctx.fmtCfg.locale ?? "de-CH";
  const monthGrid = resolvePersonalProgrammeMonthGridRange({
    monthParam: ctx.calendarMonthParam ?? formatMonthParam(now),
    timeZone,
    now,
  });
  const feedRange = resolvePersonalProgrammeRange({ timeZone, now });
  const queryRange = mergeProgrammeRanges(feedRange, {
    rangeStart: monthGrid.rangeStart,
    rangeEnd: monthGrid.rangeEnd,
  });
  const monthParam = monthGrid.monthWindow.param;

  const programme = await loadPersonalProgramme({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    timeZone,
    now,
    from: queryRange.rangeStart,
    to: queryRange.rangeEnd,
    permissionKeys: ctx.permissionKeys,
    personalContext: undefined,
  });

  const programmeFeedItems = filterProgrammeItemsToRange(programme.items, feedRange);
  const programmeFeedGroups = buildProgrammeFeedGroups({
    items: programmeFeedItems,
    timeZone,
    locale,
    now,
  });

  return {
    groups: programmeFeedGroups,
    programmeSupported: programme.supported,
    programmeItems: programme.items,
    monthParam,
    navigation: {
      previousMonthHref: `/dashboard?monat=${shiftMonthParam(monthParam, -1)}`,
      nextMonthHref: `/dashboard?monat=${shiftMonthParam(monthParam, 1)}`,
      todayHref: `/dashboard?monat=${formatMonthParam(new Date())}`,
    },
  };
}

const loadPersonalDashboardWorkSectionCached = cache(
  async (ctx: PersonalDashboardSectionContext) => {
    if (personalDashboardReadModelEnabled()) {
      const core = await readPersonalDashboardCoreCached(ctx);
      return {
        attention: core.personalAttention,
        tasks: {
          authorized: core.personalTasksAvailable,
          preview: core.personalTaskPreview,
        },
      };
    }

    const now = new Date();
    const locale = ctx.fmtCfg.locale ?? "de-CH";
    const timeZone = ctx.fmtCfg.timezone ?? "Europe/Zurich";

    const personalWork = await loadDashboardPersonalWork({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      fmtCfg: ctx.fmtCfg,
      locale,
      timeZone,
      now,
      permissionKeys: ctx.permissionKeys,
    });

    return {
      attention: personalWork.attention,
      tasks: personalWork.tasks,
    };
  },
);

export async function loadPersonalDashboardWorkSection(ctx: PersonalDashboardSectionContext) {
  return loadPersonalDashboardWorkSectionCached(ctx);
}

export async function loadPersonalDashboardSecondarySection(
  ctx: PersonalDashboardSectionContext,
) {
  const core = await readPersonalDashboardCoreCached(ctx);
  return {
    newsItems: core.newsItems,
    activitySources: core.activitySources,
  };
}