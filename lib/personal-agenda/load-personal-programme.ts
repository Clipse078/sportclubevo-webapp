import {
  getPersonallyRelevantTeamIds,
  resolvePersonalContext,
} from "@/lib/dashboard/personal-context";
import type { PersonalProgrammeAdapterContext } from "@/lib/dashboard/personal-context/programme-adapter-contract";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { loadTeamEventProgrammeItems } from "./adapters/team-event-programme-adapter";
import { loadTrainingProgrammeItems } from "./adapters/training-programme-adapter";
import { loadMeetingProgrammeItems } from "./adapters/meeting-programme-adapter";
import {
  resolvePersonalProgrammeRange,
  type PersonalProgrammeRange,
} from "./programme-range";
import { sortPersonalProgrammeItems } from "./programme-sort";
import type { PersonalProgrammeItem } from "./personal-programme-types";

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

  const personalContext = await resolvePersonalContext({
    tenantId: args.tenantId,
    userId: args.userId,
  });

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

  const [teamEvents, trainings, meetings] = await Promise.all([
    loadTeamEventProgrammeItems(adapterCtx),
    loadTrainingProgrammeItems(adapterCtx),
    loadMeetingProgrammeItems(adapterCtx),
  ]);

  let items = sortPersonalProgrammeItems(
    dedupeProgrammeItems([...teamEvents, ...trainings, ...meetings]),
  );

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
