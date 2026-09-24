/**
 * DASHBOARD-05 — single bounded load for personal attention + task preview.
 */

import { loadPersonalActionsModuleCapabilities } from "@/lib/personal-actions/access";
import { countPersonalActions, loadPersonalActions } from "@/lib/personal-actions";
import {
  filterPersonalActionsForInbox,
  mapPersonalActionsToPreviewItems,
} from "@/lib/personal-actions/presentation";
import { sortPersonalActions } from "@/lib/personal-actions/ordering";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { buildPersonalInboxFilterHref } from "@/lib/personal-actions/aufgaben-scope";
import {
  DASHBOARD_PERSONAL_ATTENTION_DISPLAY_LIMIT,
  DASHBOARD_PERSONAL_WORK_AGGREGATE_LIMIT,
} from "./constants";
import { mapPersonalActionsToAttentionItems } from "./map-attention-items";
import {
  collectAttentionTaskIds,
  selectPersonalAttentionCandidates,
} from "./select-attention-candidates";
import type { DashboardPersonalWorkSnapshot } from "./types";

export const DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT = 5;

export async function loadDashboardPersonalWork(args: {
  tenantId: string;
  userId: string;
  fmtCfg?: TenantFormatConfig;
  locale?: string;
  timeZone?: string;
  now?: Date;
}): Promise<DashboardPersonalWorkSnapshot> {
  const empty: DashboardPersonalWorkSnapshot = {
    attention: { authorized: false, items: [], totalCount: 0, viewAllHref: null },
    tasks: { authorized: false, count: null, preview: [] },
  };

  const capabilities = await loadPersonalActionsModuleCapabilities({
    tenantId: args.tenantId,
    userId: args.userId,
  });

  if (!capabilities.personalInbox) {
    return empty;
  }

  const now = args.now ?? new Date();
  const locale = args.locale ?? args.fmtCfg?.locale ?? "de-CH";
  const timeZone = args.timeZone ?? args.fmtCfg?.timezone ?? "Europe/Zurich";
  const fmtCfg: TenantFormatConfig = args.fmtCfg ?? {
    locale,
    timezone: timeZone,
  };

  const [counts, aggregated] = await Promise.all([
    countPersonalActions({
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys: capabilities.permissionKeys,
      now,
    }),
    loadPersonalActions({
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys: capabilities.permissionKeys,
      limit: DASHBOARD_PERSONAL_WORK_AGGREGATE_LIMIT,
      now,
    }),
  ]);

  const attentionCandidates = selectPersonalAttentionCandidates(aggregated, now);
  const attentionSorted = sortPersonalActions(attentionCandidates, now);
  const attentionItems = mapPersonalActionsToAttentionItems(
    attentionSorted.slice(0, DASHBOARD_PERSONAL_ATTENTION_DISPLAY_LIMIT),
    fmtCfg,
    locale,
    timeZone,
    now,
  );

  const attentionTaskIds = collectAttentionTaskIds(
    selectPersonalAttentionCandidates(aggregated, now),
  );

  const taskActions = filterPersonalActionsForInbox(aggregated, "tasks").filter(
    (action) => !attentionTaskIds.has(action.id),
  );
  const taskSorted = sortPersonalActions(taskActions, now).slice(
    0,
    DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT,
  );

  const viewAllHref = buildPersonalInboxFilterHref("all");

  return {
    attention: {
      authorized: true,
      items: attentionItems,
      totalCount: attentionSorted.length,
      viewAllHref,
    },
    tasks: {
      authorized: true,
      count: counts.taskActionable,
      preview: mapPersonalActionsToPreviewItems(taskSorted, fmtCfg, locale, timeZone),
    },
  };
}
