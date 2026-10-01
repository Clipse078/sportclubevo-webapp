import { dedupePersonalActionsById, sortPersonalActions } from "./ordering";
import { resolvePersonalActionSourceContext } from "./load-context";
import { personalActionSources } from "./sources";
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

function personalActionCountsFromChunks(input: {
  taskActions: PersonalAction[];
  attendanceActions: PersonalAction[];
  requirementActions: PersonalAction[];
}): PersonalActionCounts {
  const uniqueAttendance = dedupePersonalActionsById(input.attendanceActions);
  const uniqueRequirements = dedupePersonalActionsById(input.requirementActions);
  const taskActionable = input.taskActions.length;
  const attendanceActionable = uniqueAttendance.length;
  const requirementActionable = uniqueRequirements.length;
  return {
    taskActionable,
    attendanceActionable,
    requirementActionable,
    totalActionable: taskActionable + attendanceActionable + requirementActionable,
  };
}

/**
 * Single batched pass over personal-action sources (dashboard hot path).
 * Avoids duplicate adapter/DB work from parallel count + load.
 */
export async function loadPersonalActionsWithCounts(
  args: LoadPersonalActionsArgs,
): Promise<{ actions: PersonalAction[]; counts: PersonalActionCounts }> {
  const ctx = await resolvePersonalActionSourceContext(args);
  const trace = sceHotfixLogin01TraceEnabled();

  const loadSource = async (
    step: string,
    loader: () => Promise<PersonalAction[]>,
  ): Promise<PersonalAction[]> => {
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

  const [taskActions, attendanceActions, requirementActions] = await Promise.all([
    loadSource("personal-actions-tasks", () => taskPersonalActionSource.loadActionable(ctx)),
    loadSource("personal-actions-attendance", () =>
      attendancePersonalActionSource.loadActionable(ctx),
    ),
    loadSource("personal-actions-requirements", () =>
      requirementPersonalActionSource.loadActionable(ctx),
    ),
  ]);

  const counts = personalActionCountsFromChunks({
    taskActions,
    attendanceActions,
    requirementActions,
  });

  const merged = sortPersonalActions(
    dedupePersonalActionsById([...taskActions, ...attendanceActions, ...requirementActions]),
    ctx.now,
  );
  const actions =
    args.limit != null && args.limit > 0 ? merged.slice(0, args.limit) : merged;

  return { actions: actions, counts };
}
