/**
 * Dashboard personal Aufgaben — PersonalAction read model (AUFGABEN-05-UI).
 */

import { loadPersonalActionsModuleCapabilities } from "@/lib/personal-actions/access";
import {
  countPersonalActions,
  loadDashboardPersonalActions,
} from "@/lib/personal-actions";
import { mapPersonalActionsToPreviewItems } from "@/lib/personal-actions/presentation";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export const DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT = 5;

export type DashboardPersonalTaskPreviewItem = {
  id: string;
  title: string;
  subtitle: string | null;
  metaLine: string | null;
  href: string | null;
  sourceLabel: string;
};

export type DashboardPersonalTasksSnapshot = {
  /** User may use Meine Aufgaben (task and/or participation domain). */
  authorized: boolean;
  /** Actionable personal count after stable-id deduplication; null when unauthorized. */
  count: number | null;
  preview: DashboardPersonalTaskPreviewItem[];
};

export async function loadDashboardPersonalTasks(args: {
  tenantId: string;
  userId: string;
  fmtCfg?: TenantFormatConfig;
  locale?: string;
  timeZone?: string;
}): Promise<DashboardPersonalTasksSnapshot> {
  const capabilities = await loadPersonalActionsModuleCapabilities({
    tenantId: args.tenantId,
    userId: args.userId,
  });

  if (!capabilities.personalInbox) {
    return { authorized: false, count: null, preview: [] };
  }

  const locale = args.locale ?? args.fmtCfg?.locale ?? "de-CH";
  const timeZone = args.timeZone ?? args.fmtCfg?.timezone ?? "Europe/Zurich";
  const fmtCfg: TenantFormatConfig = args.fmtCfg ?? {
    locale,
    timezone: timeZone,
  };

  const [counts, actions] = await Promise.all([
    countPersonalActions({
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys: capabilities.permissionKeys,
    }),
    loadDashboardPersonalActions({
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys: capabilities.permissionKeys,
    }),
  ]);

  return {
    authorized: true,
    count: counts.totalActionable,
    preview: mapPersonalActionsToPreviewItems(actions, fmtCfg, locale, timeZone),
  };
}
