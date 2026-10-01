/**
 * DASHBOARD-05 — single bounded load for personal attention + task preview.
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — merges live domain operational attention.
 */

import { loadPersonalActionsModuleCapabilities } from "@/lib/personal-actions/access";
import { loadPersonalActionsWithCounts } from "@/lib/personal-actions";
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
import {
  logSceHotfixLogin01Milestone,
  logSceHotfixLogin01Step,
  logSceHotfixLogin01StepDone,
  runWithSceHotfixLogin01Trace,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";

const SKIP_OPERATIONAL_FOR_ISOLATION =
  process.env.SCE_HOTFIX_LOGIN_01_SKIP_OPERATIONAL === "1";

export const DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT = 5;

export async function loadDashboardPersonalWork(args: {
  tenantId: string;
  userId: string;
  fmtCfg?: TenantFormatConfig;
  locale?: string;
  timeZone?: string;
  now?: Date;
  /** Pre-resolved tenant/platform permission keys (avoids duplicate resolver work on dashboard SSR). */
  permissionKeys?: readonly string[];
}): Promise<DashboardPersonalWorkSnapshot> {
  const empty: DashboardPersonalWorkSnapshot = {
    attention: {
      authorized: false,
      items: [],
      totalCount: 0,
      viewAllHref: null,
      operationalSourcesDegraded: false,
    },
    tasks: { authorized: false, count: null, preview: [] },
  };

  const now = args.now ?? new Date();
  const locale = args.locale ?? args.fmtCfg?.locale ?? "de-CH";
  const timeZone = args.timeZone ?? args.fmtCfg?.timezone ?? "Europe/Zurich";
  const fmtCfg: TenantFormatConfig = args.fmtCfg ?? {
    locale,
    timezone: timeZone,
  };

  const capabilities = sceHotfixLogin01TraceEnabled()
    ? await runWithSceHotfixLogin01Trace("personal-work-capabilities", () =>
        loadPersonalActionsModuleCapabilities({
          tenantId: args.tenantId,
          userId: args.userId,
        }),
      )
    : await loadPersonalActionsModuleCapabilities({
        tenantId: args.tenantId,
        userId: args.userId,
      });

  let effectivePlatform: string[] = [];
  let effectiveTenant: string[] = [];
  if (args.permissionKeys?.length) {
    effectivePlatform = [];
    effectiveTenant = [...args.permissionKeys];
  } else {
    const resolved = sceHotfixLogin01TraceEnabled()
      ? await runWithSceHotfixLogin01Trace("personal-work-permissions", () =>
          getRequestEffectivePermissions(args.userId, args.tenantId),
        )
      : await getRequestEffectivePermissions(args.userId, args.tenantId);
    effectivePlatform = [...resolved.platform];
    effectiveTenant = [...resolved.tenant];
  }
  const permissionKeys = new Set([
    ...effectivePlatform,
    ...effectiveTenant,
    ...capabilities.permissionKeys,
  ]);

  const runOperationalAttention = () =>
    SKIP_OPERATIONAL_FOR_ISOLATION
      ? Promise.resolve({ items: [], failedSourceKeys: [] as string[] })
      : loadDomainOperationalAttention({
          tenantId: args.tenantId,
          actorUserId: args.userId,
          permissionKeys,
          now,
        });

  if (!capabilities.personalInbox) {
    const operational = await runOperationalAttention();
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
        operationalSourcesDegraded: operational.failedSourceKeys.length > 0,
      },
      tasks: empty.tasks,
    };
  }

  const personalActionsPromise = (async () => {
    if (sceHotfixLogin01TraceEnabled()) {
      logSceHotfixLogin01Step("personal-actions");
    }
    try {
      const mergedPermissionKeys = [
        ...effectivePlatform,
        ...effectiveTenant,
        ...capabilities.permissionKeys,
      ];
      return await loadPersonalActionsWithCounts({
        tenantId: args.tenantId,
        userId: args.userId,
        permissionKeys: mergedPermissionKeys,
        limit: DASHBOARD_PERSONAL_WORK_AGGREGATE_LIMIT,
        now,
      });
    } finally {
      if (sceHotfixLogin01TraceEnabled()) {
        logSceHotfixLogin01StepDone("personal-actions");
      }
    }
  })();

  const [personalActions, operational] = await Promise.all([
    personalActionsPromise,
    runOperationalAttention(),
  ]);

  if (sceHotfixLogin01TraceEnabled()) {
    logSceHotfixLogin01Milestone("T8_PERSONAL_ACTIONS");
    logSceHotfixLogin01Milestone("T9_OPERATIONAL_ATTENTION");
  }
  const { counts, actions: aggregated } = personalActions;

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
      operationalSourcesDegraded: operational.failedSourceKeys.length > 0,
    },
    tasks: {
      authorized: true,
      count: counts.taskActionable,
      preview: mapPersonalActionsToPreviewItems(taskSorted, fmtCfg, locale, timeZone),
    },
  };
}
