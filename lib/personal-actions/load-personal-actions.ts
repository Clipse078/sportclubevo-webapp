import { dedupePersonalActionsById, sortPersonalActions } from "./ordering";
import { resolvePersonalActionSourceContext } from "./load-context";
import { personalActionSources } from "./sources";
import { getAuthorizedPersonIdsForUserInRequest } from "@/lib/participation/request-scoped-person-ids";
import { taskPersonalActionSource } from "./sources/task-source";
import { attendancePersonalActionSource } from "./sources/attendance-source";
import { requirementPersonalActionSource } from "./sources/requirement-source";
import type { LoadPersonalActionsArgs, PersonalAction, PersonalActionCounts } from "./types";
import {
  logSceHotfixLogin01StepFailed,
  logSceHotfixLogin01StepFinished,
  markSceHotfixLogin01StepStart,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";

export const DASHBOARD_PERSONAL_ACTION_PREVIEW_LIMIT = 5;

export async function loadPersonalActions(
  args: LoadPersonalActionsArgs,
): Promise<PersonalAction[]> {
  const ctx = await resolvePersonalActionSourceContext(args);

  const chunks = await Promise.all(
    personalActionSources.map((source) => source.loadActionable(ctx)),
  );

  const merged = dedupePersonalActionsById(chunks.flat());
  const ordered = sortPersonalActions(merged, ctx.now);

  if (args.limit != null && args.limit > 0) {
    return ordered.slice(0, args.limit);
  }
  return ordered;
}

export async function loadDashboardPersonalActions(
  args: Omit<LoadPersonalActionsArgs, "limit">,
): Promise<PersonalAction[]> {
  return loadPersonalActions({
    ...args,
    limit: DASHBOARD_PERSONAL_ACTION_PREVIEW_LIMIT,
  });
}

/**
 * Single batched pass over personal-action sources (dashboard hot path).
 * Avoids duplicate adapter/DB work from parallel count + load.
 */
export async function loadPersonalActionsWithCounts(
  args: LoadPersonalActionsArgs,
): Promise<{ actions: PersonalAction[]; counts: PersonalActionCounts }> {
  const trace = sceHotfixLogin01TraceEnabled();
  if (trace) {
    markSceHotfixLogin01StepStart("personal-actions:start");
  }

  const ctx = await resolvePersonalActionSourceContext(args);

  if (trace) {
    markSceHotfixLogin01StepStart("personal-actions:authorized-persons");
  }
  const authorizedPersonIds = await getAuthorizedPersonIdsForUserInRequest(
    ctx.tenantId,
    ctx.userId,
  );
  if (trace) {
    logSceHotfixLogin01StepFinished("personal-actions:authorized-persons", {
      candidateCount: authorizedPersonIds.length,
    });
  }

  const perSourceCap =
    args.limit != null && args.limit > 0 ? args.limit : undefined;
  const dashboardCtx = {
    ...ctx,
    authorizedPersonIds,
    actionableItemCap: perSourceCap,
  };

  const loadSource = async <T>(
    step: string,
    loader: () => Promise<T>,
    metrics?: (result: T) => Record<string, number | string | boolean>,
  ): Promise<T> => {
    if (trace) {
      markSceHotfixLogin01StepStart(step);
    }
    try {
      const result = await loader();
      if (trace) {
        logSceHotfixLogin01StepFinished(step, metrics?.(result));
      }
      return result;
    } catch (error) {
      if (trace) {
        logSceHotfixLogin01StepFailed(step, error);
      }
      throw error;
    }
  };

  const [taskActions, taskActionable, attendanceActions, requirementActions] =
    await Promise.all([
      loadSource(
        "personal-actions:tasks",
        () => taskPersonalActionSource.loadActionable(dashboardCtx),
        (actions) => ({
          postFilterCount: actions.length,
          candidateCount: perSourceCap ?? actions.length,
        }),
      ),
      loadSource(
        "personal-actions:tasks-count",
        () => taskPersonalActionSource.countActionable(dashboardCtx),
        (count) => ({ count }),
      ),
      loadSource(
        "personal-actions:attendance",
        () => attendancePersonalActionSource.loadActionable(dashboardCtx),
        (actions) => ({ postFilterCount: actions.length }),
      ),
      loadSource(
        "personal-actions:requirements",
        () => requirementPersonalActionSource.loadActionable(dashboardCtx),
        (actions) => ({ postFilterCount: actions.length }),
      ),
    ]);

  let attendanceActionable = dedupePersonalActionsById(
    attendanceActions.filter((a) => a.sourceType === "ATTENDANCE_RESPONSE"),
  ).length;
  let requirementActionable = dedupePersonalActionsById(
    requirementActions.filter((a) => a.sourceType === "REQUIREMENT"),
  ).length;

  if (perSourceCap == null) {
    [attendanceActionable, requirementActionable] = await Promise.all([
      loadSource("personal-actions:attendance-count", () =>
        attendancePersonalActionSource.countActionable(dashboardCtx),
      ),
      loadSource("personal-actions:requirements-count", () =>
        requirementPersonalActionSource.countActionable(dashboardCtx),
      ),
    ]);
  }

  const counts: PersonalActionCounts = {
    taskActionable,
    attendanceActionable,
    requirementActionable,
    totalActionable: taskActionable + attendanceActionable + requirementActionable,
  };

  const mergeStart = trace ? Date.now() : 0;
  if (trace) {
    markSceHotfixLogin01StepStart("personal-actions:merge");
  }

  const merged = sortPersonalActions(
    dedupePersonalActionsById([...taskActions, ...attendanceActions, ...requirementActions]),
    ctx.now,
  );
  const actions =
    args.limit != null && args.limit > 0 ? merged.slice(0, args.limit) : merged;

  if (trace) {
    logSceHotfixLogin01StepFinished("personal-actions:merge", {
      durationMs: Date.now() - mergeStart,
      postFilterCount: actions.length,
      candidateCount: merged.length,
    });
    logSceHotfixLogin01StepFinished("personal-actions:done", {
      totalActionable: counts.totalActionable,
      returnedCount: actions.length,
    });
  }

  return { actions: actions, counts };
}
