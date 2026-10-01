import { prisma } from "@/lib/db/prisma";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
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
import type { PersonalCommandCenterData } from "@/lib/dashboard/personal-command-center";
import {
  logSceHotfixLogin01Step,
  logSceHotfixLogin01StepDone,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";
import { applyLiveAuthorizationToProjection } from "./apply-live-authorization";
import { parsePersonalDashboardReadModelPayload } from "./payload-codec";
import {
  PERSONAL_DASHBOARD_READ_MODEL_MAX_AGE_MS,
  PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
} from "./constants";
import { schedulePersonalDashboardReadModelRebuild } from "./invalidate";

export type PersonalDashboardProjectionReadResult =
  | { status: "hit"; data: PersonalCommandCenterData; projectionAgeMs: number }
  | {
      status: "stale";
      data: PersonalCommandCenterData;
      projectionAgeMs: number;
    }
  | { status: "miss"; reason: "not_found" | "invalid_payload" | "tenant_mismatch" };

const emptyPersonalAttention = {
  authorized: false,
  items: [],
  totalCount: 0,
  viewAllHref: null,
};

export function buildDegradedPersonalCommandCenterData(args: {
  fmtCfg: TenantFormatConfig;
  calendarMonthParam?: string | null;
  now?: Date;
}): PersonalCommandCenterData {
  const now = args.now ?? new Date();
  const timeZone = args.fmtCfg.timezone ?? "Europe/Zurich";
  const locale = args.fmtCfg.locale ?? "de-CH";
  const monthGrid = resolvePersonalProgrammeMonthGridRange({
    monthParam: args.calendarMonthParam ?? formatMonthParam(now),
    timeZone,
    now,
  });
  const feedRange = resolvePersonalProgrammeRange({ timeZone, now });
  const monthParam = monthGrid.monthWindow.param;

  return {
    calendarMonthParam: monthParam,
    calendarNavigation: {
      previousMonthHref: `/dashboard?monat=${shiftMonthParam(monthParam, -1)}`,
      nextMonthHref: `/dashboard?monat=${shiftMonthParam(monthParam, 1)}`,
      todayHref: `/dashboard?monat=${formatMonthParam(new Date())}`,
    },
    programmeItems: [],
    programmeFeedItems: [],
    programmeFeedGroups: buildProgrammeFeedGroups({
      items: [],
      timeZone,
      locale,
      now,
    }),
    programmeSupported: false,
    programmeFeedRange: feedRange,
    personalAttention: emptyPersonalAttention,
    personalTasksAvailable: false,
    personalTaskCount: null,
    personalTaskPreview: [],
    newsItems: [],
    activitySources: [],
  };
}

export async function readPersonalDashboardProjection(args: {
  tenantId: string;
  userId: string;
  permissionKeys: readonly PermissionKey[];
  fmtCfg: TenantFormatConfig;
  calendarMonthParam?: string | null;
  now?: Date;
}): Promise<PersonalDashboardProjectionReadResult> {
  const trace = sceHotfixLogin01TraceEnabled();
  if (trace) {
    logSceHotfixLogin01Step("dashboard-projection-read");
  }

  try {
    const row = await prisma.personalDashboardReadModel.findUnique({
      where: {
        tenantId_userId: {
          tenantId: args.tenantId,
          userId: args.userId,
        },
      },
    });

    if (!row || row.tenantId !== args.tenantId) {
      return { status: "miss", reason: row ? "tenant_mismatch" : "not_found" };
    }

    const projectionAgeMs = Date.now() - row.updatedAt.getTime();
    const payload = parsePersonalDashboardReadModelPayload(row.payloadJson);
    if (!payload) {
      return { status: "miss", reason: "invalid_payload" };
    }

    const needsPresentationRefresh =
      payload.v < PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION ||
      payload.programme.items.some((item) => !item.activityPresentation);

    const isStale =
      projectionAgeMs > PERSONAL_DASHBOARD_READ_MODEL_MAX_AGE_MS || needsPresentationRefresh;
    if (isStale) {
      void schedulePersonalDashboardReadModelRebuild({
        tenantId: args.tenantId,
        userId: args.userId,
      });
    }

    const now = args.now ?? new Date();
    const timeZone = args.fmtCfg.timezone ?? "Europe/Zurich";
    const locale = args.fmtCfg.locale ?? "de-CH";
    const monthGrid = resolvePersonalProgrammeMonthGridRange({
      monthParam: args.calendarMonthParam ?? formatMonthParam(now),
      timeZone,
      now,
    });
    const feedRange = resolvePersonalProgrammeRange({ timeZone, now });
    const monthParam = monthGrid.monthWindow.param;

    const authorized = applyLiveAuthorizationToProjection({
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys: args.permissionKeys,
      payload,
    });

    const programmeFeedItems = filterProgrammeItemsToRange(
      authorized.programmeItems,
      feedRange,
    );
    const programmeFeedGroups = buildProgrammeFeedGroups({
      items: programmeFeedItems,
      timeZone,
      locale,
      now,
    });

    const data: PersonalCommandCenterData = {
      calendarMonthParam: monthParam,
      calendarNavigation: {
        previousMonthHref: `/dashboard?monat=${shiftMonthParam(monthParam, -1)}`,
        nextMonthHref: `/dashboard?monat=${shiftMonthParam(monthParam, 1)}`,
        todayHref: `/dashboard?monat=${formatMonthParam(new Date())}`,
      },
      programmeItems: authorized.programmeItems,
      programmeFeedItems,
      programmeFeedGroups,
      programmeSupported: authorized.programmeSupported,
      programmeFeedRange: feedRange,
      personalAttention: authorized.personalWork.attention,
      personalTasksAvailable: authorized.personalWork.tasks.authorized,
      personalTaskCount: authorized.personalWork.tasks.count,
      personalTaskPreview: authorized.personalWork.tasks.preview,
      newsItems: [],
      activitySources: [],
    };

    if (isStale) {
      return { status: "stale", projectionAgeMs, data };
    }
    return { status: "hit", data, projectionAgeMs };
  } finally {
    if (trace) {
      logSceHotfixLogin01StepDone("dashboard-projection-read");
    }
  }
}
