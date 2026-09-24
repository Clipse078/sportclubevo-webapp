/**
 * Dashboard personal Aufgaben — PersonalAction read model (AUFGABEN-05-UI, DASHBOARD-05).
 */

import {
  DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT,
  loadDashboardPersonalWork,
  type DashboardPersonalTaskPreviewItem,
  type DashboardPersonalTasksSnapshot,
} from "@/lib/dashboard/personal-attention";

export {
  DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT,
  type DashboardPersonalTaskPreviewItem,
};

export type { DashboardPersonalTasksSnapshot };

export async function loadDashboardPersonalTasks(args: {
  tenantId: string;
  userId: string;
  fmtCfg?: import("@/lib/tenant-runtime/formatters").TenantFormatConfig;
  locale?: string;
  timeZone?: string;
  now?: Date;
}): Promise<DashboardPersonalTasksSnapshot> {
  const work = await loadDashboardPersonalWork(args);
  return work.tasks;
}

export async function loadDashboardPersonalAttention(args: {
  tenantId: string;
  userId: string;
  fmtCfg?: import("@/lib/tenant-runtime/formatters").TenantFormatConfig;
  locale?: string;
  timeZone?: string;
  now?: Date;
}) {
  const work = await loadDashboardPersonalWork(args);
  return work.attention;
}
