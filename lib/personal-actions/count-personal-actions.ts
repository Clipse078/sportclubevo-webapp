import { resolvePersonalActionSourceContext } from "./load-context";
import { dedupePersonalActionsById } from "./ordering";
import type { LoadPersonalActionsArgs, PersonalActionCounts } from "./types";
import { taskPersonalActionSource } from "./sources/task-source";
import { attendancePersonalActionSource } from "./sources/attendance-source";
import { requirementPersonalActionSource } from "./sources/requirement-source";

export async function countPersonalActions(
  args: Omit<LoadPersonalActionsArgs, "limit">,
): Promise<PersonalActionCounts> {
  const ctx = await resolvePersonalActionSourceContext(args);

  const [taskActionable, attendanceActions, requirementActionable] = await Promise.all([
    taskPersonalActionSource.countActionable(ctx),
    attendancePersonalActionSource.loadActionable(ctx),
    requirementPersonalActionSource.countActionable(ctx),
  ]);

  const uniqueAttendance = dedupePersonalActionsById(attendanceActions);

  return {
    taskActionable,
    attendanceActionable: uniqueAttendance.length,
    requirementActionable,
    totalActionable: taskActionable + uniqueAttendance.length + requirementActionable,
  };
}
