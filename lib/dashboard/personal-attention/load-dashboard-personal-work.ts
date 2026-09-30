/**
 * DASHBOARD-05 — single bounded load for personal attention + task preview.
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — merges live domain operational attention.
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
import { loadDomainOperationalAttention } from "@/lib/domain-attention/load-domain-operational-attention";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import {
  DASHBOARD_PERSONAL_ATTENTION_DISPLAY_LIMIT,
  DASHBOARD_PERSONAL_WORK_AGGREGATE_LIMIT,
} from "./constants";
import { mapPersonalActionsToAttentionItems } from "./map-attention-items";
import { mapDomainOperationalAttentionItems } from "./map-domain-operational-attention";
import {
  dedupePersonalAttentionItemsById,
  sortPersonalAttentionItems,
} from "./sort-attention-items";
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

  const now = args.now ?? new Date();
  const locale = args.locale ?? args.fmtCfg?.locale ?? "de-CH";
  const timeZone = args.timeZone ?? args.fmtCfg?.timezone ?? "Europe/Zurich";
  const fmtCfg: TenantFormatConfig = args.fmtCfg ?? {
    locale,
    timezone: timeZone,
  };

  const capabilities = await loadPersonalActionsModuleCapabilities({
    tenantId: args.tenantId,
    userId: args.userId,
  });

  const { platform, tenant } = await getRequestEffectivePermissions(args.userId, args.tenantId);
  const permissionKeys = new Set([...platform, ...tenant, ...capabilities.permissionKeys]);

  const operationalPromise = loadDomainOperationalAttention({
    tenantId: args.tenantId,
    actorUserId: args.userId,
    permissionKeys,
    now,
  });

  if (!capabilities.personalInbox) {
    const operational = await operationalPromise;
    const operationalItems = mapDomainOperationalAttentionItems(operational.items);
    const sortedOperational = sortPersonalAttentionItems(operationalItems);

    if (sortedOperational.length === 0) {
      return empty;
    }

    return {
      attention: {
        authorized: true,
        items: sortedOperational.slice(0, DASHBOARD_PERSONAL_ATTENTION_DISPLAY_LIMIT),
        totalCount: sortedOperational.length,
        viewAllHref: null,
      },
      tasks: empty.tasks,
    };
  }

  const [counts, aggregated, operational] = await Promise.all([
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
    operationalPromise,
  ]);

  const attentionCandidates = selectPersonalAttentionCandidates(aggregated, now);
  const attentionSorted = sortPersonalActions(attentionCandidates, now);
  const personalAttentionItems = mapPersonalActionsToAttentionItems(
    attentionSorted,
    fmtCfg,
    locale,
    timeZone,
    now,
  );

  const operationalAttentionItems = mapDomainOperationalAttentionItems(operational.items);
  const combinedAttention = sortPersonalAttentionItems(
    dedupePersonalAttentionItemsById([...personalAttentionItems, ...operationalAttentionItems]),
  );

  const attentionItems = combinedAttention.slice(0, DASHBOARD_PERSONAL_ATTENTION_DISPLAY_LIMIT);

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
      totalCount: combinedAttention.length,
      viewAllHref,
    },
    tasks: {
      authorized: true,
      count: counts.taskActionable,
      preview: mapPersonalActionsToPreviewItems(taskSorted, fmtCfg, locale, timeZone),
    },
  };
}
