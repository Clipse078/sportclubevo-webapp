import {
  getPersonallyRelevantTeamIds,
  resolvePersonalContext,
} from "@/lib/dashboard/personal-context";
import type { PersonalContext } from "@/lib/dashboard/personal-context/types";
import type { PersonalProgrammeAdapterContext } from "@/lib/dashboard/personal-context/programme-adapter-contract";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { loadMeetingProgrammeItems } from "./adapters/meeting-programme-adapter";
import { prisma } from "@/lib/db/prisma";
import { queryProgramme } from "@/lib/programme-engine/query-programme";
import { buildPersonProgrammeScope } from "@/lib/programme-engine/person-programme-scope";
import { programmeItemsToPersonalProgrammeItems } from "@/lib/programme-engine/programme-item-personal-adapter";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";
import {
  resolvePersonalProgrammeRange,
  type PersonalProgrammeRange,
} from "./programme-range";
import { sortPersonalProgrammeItems } from "./programme-sort";
import type { PersonalProgrammeItem } from "./personal-programme-types";
import {
  logSceHotfixLogin01StepFailed,
  logSceHotfixLogin01StepFinished,
  logSceHotfixLogin01Milestone,
  markSceHotfixLogin01StepStart,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";

export type LoadPersonalProgrammeArgs = {
  tenantId: string;
  userId: string | null | undefined;
  timeZone: string;
  now?: Date;
  /** Explicit inclusive range; when omitted, canonical default (today → +14 tenant-local days). */
  from?: Date;
  to?: Date;
  /** Optional pre-resolved permission keys. */
  permissionKeys?: string[];
  /** Optional pre-resolved personal context (DashboardContext). */
  personalContext?: PersonalContext;
  limit?: number;
};

export type LoadPersonalProgrammeResult = {
  items: PersonalProgrammeItem[];
  range: PersonalProgrammeRange;
  teamIds: string[];
  hasLinkedPerson: boolean;
  supported: boolean;
};

function dedupeProgrammeItems(items: PersonalProgrammeItem[]): PersonalProgrammeItem[] {
  const byKey = new Map<string, PersonalProgrammeItem>();
  for (const item of items) {
    if (!byKey.has(item.id)) {
      byKey.set(item.id, item);
    }
  }
  return [...byKey.values()];
}

export async function loadPersonalProgramme(
  args: LoadPersonalProgrammeArgs,
): Promise<LoadPersonalProgrammeResult> {
  const range = resolvePersonalProgrammeRange({
    timeZone: args.timeZone,
    now: args.now,
    from: args.from,
    to: args.to,
  });

  if (!args.userId) {
    return {
      items: [],
      range,
      teamIds: [],
      hasLinkedPerson: false,
      supported: false,
    };
  }

  const trace = sceHotfixLogin01TraceEnabled();
  if (trace) {
    markSceHotfixLogin01StepStart("programme-personal-context");
  }
  let personalContext;
  try {
    personalContext =
      args.personalContext ??
      (await resolvePersonalContext({
        tenantId: args.tenantId,
        userId: args.userId,
      }));
    if (trace) {
      logSceHotfixLogin01StepFinished("programme-personal-context");
    }
  } catch (error) {
    if (trace) {
      logSceHotfixLogin01StepFailed("programme-personal-context", error);
    }
    throw error;
  }

  const teamIds = getPersonallyRelevantTeamIds(personalContext);
  const { hasLinkedPerson } = personalContext;
  const hasMeetingScope = Boolean(args.userId);
  const supported =
    hasLinkedPerson ||
    hasMeetingScope ||
    (teamIds.length > 0 && personalContext.hasActiveTenantMembership);

  if (!personalContext.hasActiveTenantMembership) {
    return { items: [], range, teamIds, hasLinkedPerson, supported: false };
  }

  let permissionKeys = args.permissionKeys;
  if (!permissionKeys) {
    const { platform, tenant } = await getRequestEffectivePermissions(
      args.userId,
      args.tenantId,
    );
    permissionKeys = [...platform, ...tenant];
  }

  const adapterCtx: PersonalProgrammeAdapterContext = {
    personal: personalContext,
    permissionKeys,
    timeZone: args.timeZone,
    rangeStart: range.rangeStart,
    rangeEnd: range.rangeEnd,
  };

  const loadAdapter = async (step: string, loader: () => Promise<PersonalProgrammeItem[]>) => {
    if (trace) {
      markSceHotfixLogin01StepStart(step);
    }
    try {
      const rows = await loader();
      if (trace) {
        logSceHotfixLogin01StepFinished(step, { rowCount: rows.length });
      }
      return rows;
    } catch (error) {
      if (trace) {
        logSceHotfixLogin01StepFailed(step, error);
      }
      throw error;
    }
  };

  const [programmeQuery, meetings] = await Promise.all([
    loadAdapter("programme-engine-person", async () => {
      const [tenant, tenantLogoUrl] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: args.tenantId },
          select: { name: true },
        }),
        getTenantClubCrestUrlCached(args.tenantId),
      ]);

      const result = await queryProgramme({
        tenantId: args.tenantId,
        userId: args.userId!,
        timeZone: args.timeZone,
        now: args.now,
        from: range.rangeStart,
        to: range.rangeEnd,
        permissionKeys: permissionKeys ?? [],
        tenantClubName: tenant?.name ?? null,
        tenantLogoUrl,
        scope: buildPersonProgrammeScope(personalContext),
      });

      return programmeItemsToPersonalProgrammeItems(result.items, personalContext);
    }),
    loadAdapter("programme-meetings", () => loadMeetingProgrammeItems(adapterCtx)),
  ]);

  if (trace) {
    markSceHotfixLogin01StepStart("programme-merge");
  }
  let items = sortPersonalProgrammeItems(
    dedupeProgrammeItems([...programmeQuery, ...meetings]),
  );
  if (trace) {
    logSceHotfixLogin01StepFinished("programme-merge", { rowCount: items.length });
    logSceHotfixLogin01Milestone("T6_PROGRAMME");
    logSceHotfixLogin01Milestone("T7_CALENDAR");
  }

  if (args.limit != null && args.limit > 0) {
    items = items.slice(0, args.limit);
  }

  return { items, range, teamIds, hasLinkedPerson, supported };
}

/**
 * RSC-friendly entry for dashboard programme (DASHBOARD-02).
 * Tasks and participation deadlines remain in loadPersonalAgenda / DASHBOARD-05.
 */
export async function getPersonalDashboardProgramme(
  args: LoadPersonalProgrammeArgs,
): Promise<LoadPersonalProgrammeResult> {
  return loadPersonalProgramme(args);
}
