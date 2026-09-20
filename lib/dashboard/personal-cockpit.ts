/**
 * DASHBOARD-UX-01 — Personal operational cockpit builders and constants.
 * AUFGABEN-04A — delegates agenda loading to lib/personal-agenda.
 */

import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { CommandCenterKpi } from "@/lib/dashboard/command-center";
import { loadPersonalAgenda } from "@/lib/personal-agenda/load-personal-agenda";
import {
  groupPersonalAgendaItems,
  mapPersonalCalendarItemsToAgendaItems,
  type PersonalAgendaDayGroup,
  type PersonalAgendaItem,
} from "@/lib/personal-agenda/map-to-dashboard";
import { resolvePersonalTeamIds } from "@/lib/personal-agenda/team-scope";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type { PersonalAgendaDayGroup, PersonalAgendaItem };
export { groupPersonalAgendaItems, resolvePersonalTeamIds };

export type PersonalCockpitExtension = {
  personalAgendaItems: PersonalAgendaItem[];
  personalAgendaSupported: boolean;
  personalTaskCount: number | null;
  kpiStrip: CommandCenterKpi[];
};

export async function loadPersonalAgendaItems(args: {
  tenantId: string;
  userId: string | null | undefined;
  teamIds: string[];
  hasLinkedPerson: boolean;
  fmtCfg: TenantFormatConfig;
  timeZone?: string;
  now?: Date;
}): Promise<{ items: PersonalAgendaItem[]; supported: boolean }> {
  if (!args.userId) {
    return { items: [], supported: false };
  }

  const { platform, tenant } = await getRequestEffectivePermissions(
    args.userId,
    args.tenantId,
  );
  const permissionKeys = [...platform, ...tenant];
  const tasksViewAuthorized = permissionKeys.includes(PERMISSIONS.TASKS_VIEW);
  const timeZone = args.timeZone ?? args.fmtCfg.timezone ?? "Europe/Zurich";

  const loaded = await loadPersonalAgenda({
    tenantId: args.tenantId,
    userId: args.userId,
    timeZone,
    now: args.now,
    mode: "dashboard",
    tasksViewAuthorized,
    includeOverdueTasks: true,
  });

  const items = mapPersonalCalendarItemsToAgendaItems({
    items: loaded.items,
    fmtCfg: args.fmtCfg,
    timeZone,
    now: args.now,
  });

  return {
    items,
    supported: loaded.supported,
  };
}

export function buildPersonalCockpitKpiStrip(input: {
  personalScheduleCount: number | null;
  personalTasksAvailable: boolean;
  personalTaskCount: number | null;
  attentionCount: number;
  openRegistrationCount: number;
  canSeeRegistrations: boolean;
}): CommandCenterKpi[] {
  const kpis: CommandCenterKpi[] = [
    {
      key: "my-tasks",
      label: "Meine Aufgaben",
      value:
        input.personalTasksAvailable && input.personalTaskCount !== null
          ? String(input.personalTaskCount)
          : "—",
      context: undefined,
    },
    {
      key: "my-schedule",
      label: "Meine Termine",
      value:
        input.personalScheduleCount !== null
          ? String(input.personalScheduleCount)
          : "—",
      context:
        input.personalScheduleCount === null
          ? "Persönliche Zuordnung nicht verfügbar"
          : undefined,
    },
    {
      key: "attention",
      label: "Benötigt Aufmerksamkeit",
      value: String(input.attentionCount),
    },
  ];

  if (input.canSeeRegistrations) {
    kpis.push({
      key: "registrations",
      label: "Offene Anmeldungen",
      value: String(input.openRegistrationCount),
    });
  }

  return kpis.slice(0, 4);
}
