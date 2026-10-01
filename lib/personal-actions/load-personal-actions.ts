import { dedupePersonalActionsById, sortPersonalActions } from "./ordering";
import { resolvePersonalActionSourceContext } from "./load-context";
import { personalActionSources } from "./sources";
import { getAuthorizedPersonIdsForUserInRequest } from "@/lib/participation/request-scoped-person-ids";
import { taskPersonalActionSource } from "./sources/task-source";
import { attendancePersonalActionSource } from "./sources/attendance-source";
import { requirementPersonalActionSource } from "./sources/requirement-source";
import type { LoadPersonalActionsArgs, PersonalAction, PersonalActionCounts } from "./types";
import {
  logSceHotfixLogin01Step,
  logSceHotfixLogin01StepDone,
  logSceHotfixLogin01StepFailed,
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
  const ctx = await resolvePersonalActionSourceContext(args);
  const authorizedPersonIds = await getAuthorizedPersonIdsForUserInRequest(
    ctx.tenantId,
    ctx.userId,
  );
  const perSourceCap =
    args.limit != null && args.limit > 0 ? args.limit : undefined;
  const dashboardCtx = {
    ...ctx,
    authorizedPersonIds,
    actionableItemCap: perSourceCap,
  };
  const trace = sceHotfixLogin01TraceEnabled();

  const loadSource = async <T>(
    step: string,
    loader: () => Promise<T>,
  ): Promise<T> => {
    if (trace) {
      logSceHotfixLogin01Step(step);
    }
    try {
      const result = await loader();
      if (trace) {
        logSceHotfixLogin01StepDone(step);
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
      loadSource("personal-actions-tasks", () =>
        taskPersonalActionSource.loadActionable(dashboardCtx),
      ),
      loadSource("personal-actions-tasks-count", () =>
        taskPersonalActionSource.countActionable(dashboardCtx),
      ),
      loadSource("personal-actions-attendance", () =>
        attendancePersonalActionSource.loadActionable(dashboardCtx),
      ),
      loadSource("personal-actions-requirements", () =>
        requirementPersonalActionSource.loadActionable(dashboardCtx),
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
      loadSource("personal-actions-attendance-count", () =>
        attendancePersonalActionSource.countActionable(dashboardCtx),
      ),
      loadSource("personal-actions-requirements-count", () =>
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

  const merged = sortPersonalActions(
    dedupePersonalActionsById([...taskActions, ...attendanceActions, ...requirementActions]),
    ctx.now,
  );
  const actions =
    args.limit != null && args.limit > 0 ? merged.slice(0, args.limit) : merged;

  return { actions: actions, counts };
}
