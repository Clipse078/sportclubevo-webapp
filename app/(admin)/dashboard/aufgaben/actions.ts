"use server";

import { revalidatePath } from "next/cache";
import type {
  TaskContextType,
  TaskPriority,
  TaskStatus,
  TaskVisibilityScope,
} from "@prisma/client";
import { TaskVisibilityScope as TaskVisibilityScopeEnum } from "@prisma/client";
import { isSupportedTaskContextType } from "@/lib/tasks/context-registry";
import { createTaskWithContextDefaults } from "@/lib/tasks/contextual-task-create";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import {
  assignTask,
  cancelTask,
  completeTask,
  createSubtask,
  createQuickTask,
  createTask,
  updateTask,
} from "@/lib/tasks/task-service";
import {
  findForbiddenQuickCreateFormFields,
  normalizeQuickCreateAssigneeIds,
  parseQuickCreateAssigneeField,
  resolveQuickCreateCapabilities,
} from "@/lib/tasks/quick-create";
import { searchEligibleTaskAssignees } from "@/lib/tasks/queries";
import { parseIdListFromForm } from "@/lib/tasks/task-access-grants";
import type {
  TaskRecurrenceFrequency,
  TaskSeriesWeekday,
} from "@prisma/client";
import {
  createTaskSeries,
  endTaskSeries,
  generateTaskOccurrences,
  pauseTaskSeries,
  resumeTaskSeries,
  updateTaskSeries,
  type TaskSeriesSubtaskTemplateInput,
} from "@/lib/tasks/task-series-service";
import {
  ParentHasOpenSubtasksError,
  TaskForbiddenError,
  TaskNotFoundError,
  TaskValidationError,
} from "@/lib/tasks/errors";
import { parseTaskVisibilityScope } from "@/lib/tasks/task-org-mutation-policy";
import { prisma } from "@/lib/db/prisma";
import { parseTaskReminderFieldsFromForm } from "@/lib/tasks/parse-task-reminder-form";
import {
  parseTaskDueAtFromForm,
  parseTaskReminderPresetKey,
} from "@/lib/tasks/task-reminder-schedule";
import {
  createTaskComment,
  deleteTaskComment,
  updateTaskComment,
} from "@/lib/tasks/task-comment-service";
import { searchTaskMentionCandidates } from "@/lib/tasks/task-mention-candidates";
import { requireVisibleTask } from "@/lib/tasks/task-access";
import {
  loadTaskTimelinePage,
  loadTaskTimelinePageForCommentAnchor,
} from "@/lib/tasks/task-timeline-service";
import type { TaskTimelinePageDto } from "@/lib/tasks/task-timeline-types";
import {
  followTask,
  unfollowTask,
  type TaskFollowStateDto,
} from "@/lib/tasks/task-follow-service";
import {
  linkTaskDocument,
  searchWorkspaceDocumentsForTaskReferenceLink,
  unlinkTaskDocument,
  type TaskDocumentReferenceDto,
} from "@/lib/tasks/task-document-reference-service";
import type { WorkspaceDocumentPickerOption } from "@/lib/workspace/document-access";

export type AufgabenActionResult =
  | { ok: true; taskId?: string }
  | { ok: false; message: string };

export type TaskTimelineActionResult =
  | { ok: true; page: TaskTimelinePageDto }
  | { ok: false; message: string };

export type TaskCommentActionResult =
  | { ok: true; commentId: string }
  | { ok: false; message: string };

export type TaskFollowActionResult =
  | { ok: true; state: TaskFollowStateDto }
  | { ok: false; message: string };

function revalidateTaskPaths(taskId?: string) {
  revalidatePath("/dashboard/aufgaben");
  revalidatePath("/dashboard");
  if (taskId) {
    revalidatePath(`/dashboard/aufgaben/${taskId}`);
  }
}

function revalidateSeriesPaths(seriesId?: string) {
  revalidatePath("/dashboard/aufgaben");
  revalidatePath("/dashboard/aufgaben", "layout");
  if (seriesId) {
    revalidatePath(`/dashboard/aufgaben/serien/${seriesId}`);
  }
}

const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

function parseWeekday(raw: FormDataEntryValue | null): TaskSeriesWeekday | undefined {
  if (typeof raw === "string" && (WEEKDAYS as readonly string[]).includes(raw)) {
    return raw as TaskSeriesWeekday;
  }
  return undefined;
}

function parseFrequency(raw: FormDataEntryValue | null): TaskRecurrenceFrequency | undefined {
  if (raw === "WEEKLY" || raw === "MONTHLY") return raw;
  return undefined;
}

function parseAssigneeIds(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSubtaskTemplatesJson(
  raw: FormDataEntryValue | null,
): TaskSeriesSubtaskTemplateInput[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const templates: TaskSeriesSubtaskTemplateInput[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.title !== "string" || !row.title.trim()) continue;
      templates.push({
        title: row.title,
        description: typeof row.description === "string" ? row.description : null,
        priority: parsePriority(String(row.priority ?? "")),
        dueOffsetDays:
          typeof row.dueOffsetDays === "number"
            ? row.dueOffsetDays
            : Number(row.dueOffsetDays ?? 0) || 0,
        assigneeUserIds: Array.isArray(row.assigneeUserIds)
          ? row.assigneeUserIds.filter((id): id is string => typeof id === "string")
          : [],
      });
    }
    return templates;
  } catch {
    return [];
  }
}

function parseStartsOn(raw: FormDataEntryValue | null): Date | null | "invalid" {
  if (raw === null || (typeof raw === "string" && !raw.trim())) return null;
  if (typeof raw !== "string") return "invalid";
  const d = new Date(`${raw.trim()}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d;
}

function actionErrorMessage(error: unknown): string {
  const result = failure(error);
  return result.ok ? "Unbekannter Fehler." : result.message;
}

function failure(error: unknown): AufgabenActionResult {
  if (error instanceof ParentHasOpenSubtasksError) {
    return {
      ok: false,
      message:
        "Diese Aufgabe kann noch nicht abgeschlossen werden, da offene Unteraufgaben bestehen.",
    };
  }
  if (error instanceof TaskValidationError) {
    return { ok: false, message: error.message };
  }
  if (error instanceof TaskForbiddenError) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }
  if (error instanceof TaskNotFoundError) {
    return { ok: false, message: "Aufgabe nicht gefunden." };
  }
  return { ok: false, message: "Aktion fehlgeschlagen." };
}

export async function searchQuickCreateAssigneesAction(
  query: string,
): Promise<
  | { ok: true; options: Awaited<ReturnType<typeof searchEligibleTaskAssignees>> }
  | { ok: false; message: string }
> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  const quickCaps = resolveQuickCreateCapabilities(ctx);
  if (!quickCaps.canAssignOthers) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }

  const options = await searchEligibleTaskAssignees(ctx.tenantId, query);
  return {
    ok: true,
    options: options.filter((o) => o.userId !== ctx.userId),
  };
}

export async function createQuickAufgabeAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  const quickCaps = resolveQuickCreateCapabilities(ctx);
  if (!quickCaps.canCreateSelf) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }

  if (findForbiddenQuickCreateFormFields(formData)) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }

  try {
    const title = formData.get("title");
    const description = formData.get("description");
    const priority = formData.get("priority");

    const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
    const parsedPriority =
      typeof priority === "string" &&
      (validPriorities as readonly string[]).includes(priority)
        ? (priority as TaskPriority)
        : undefined;

    const schedule = await parseDeadlineAndRemindersFromForm(ctx.tenantId, formData);
    if (schedule === "invalid_due") {
      return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
    }
    if (schedule === "invalid_reminder") {
      return { ok: false, message: "Ungültige Erinnerung." };
    }

    const assigneeParse = parseQuickCreateAssigneeField(formData);
    if (!assigneeParse.ok) {
      return { ok: false, message: "Ungültige Zuweisung." };
    }

    const assigneeUserIds = normalizeQuickCreateAssigneeIds(
      ctx,
      assigneeParse.ids,
      quickCaps.canAssignOthers,
      assigneeParse.defaultToSelfWhenEmpty,
    );

    const created = await createQuickTask(ctx, {
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : null,
      priority: parsedPriority,
      dueAt: schedule?.dueAt ?? null,
      reminder1At: schedule?.reminder1At ?? null,
      reminder2At: schedule?.reminder2At ?? null,
      reminder1PresetKey: schedule?.reminder1PresetKey ?? null,
      reminder2PresetKey: schedule?.reminder2PresetKey ?? null,
      assigneeUserIds,
    });

    revalidateTaskPaths(created.id);
    return { ok: true, taskId: created.id };
  } catch (error) {
    return failure(error);
  }
}

export async function createAufgabeAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const title = formData.get("title");
    const description = formData.get("description");
    const priority = formData.get("priority");
    const dueAtRaw = formData.get("dueAt");
    const assigneeUserId = formData.get("assigneeUserId");

    const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
    const parsedPriority =
      typeof priority === "string" &&
      (validPriorities as readonly string[]).includes(priority)
        ? (priority as TaskPriority)
        : undefined;

    const schedule =
      formData.has("dueTime") || formData.has("reminder1Preset")
        ? await parseDeadlineAndRemindersFromForm(ctx.tenantId, formData)
        : null;

    let dueAt: Date | null = null;
    let reminderFields = {};
    if (schedule) {
      if (schedule === "invalid_due") {
        return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
      }
      if (schedule === "invalid_reminder") {
        return { ok: false, message: "Ungültige Erinnerung." };
      }
      dueAt = schedule.dueAt;
      reminderFields = {
        reminder1At: schedule.reminder1At,
        reminder2At: schedule.reminder2At,
        reminder1PresetKey: schedule.reminder1PresetKey,
        reminder2PresetKey: schedule.reminder2PresetKey,
      };
    } else if (typeof dueAtRaw === "string" && dueAtRaw.trim()) {
      dueAt = new Date(`${dueAtRaw}T12:00:00.000Z`);
      if (Number.isNaN(dueAt.getTime())) {
        return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
      }
    }

    const orgVisibility = parseOrgVisibilityFromForm(formData);

    const created = await createTask(ctx, {
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : null,
      priority: parsedPriority,
      dueAt,
      ...reminderFields,
      assigneeUserIds:
        typeof assigneeUserId === "string" && assigneeUserId.trim()
          ? [assigneeUserId.trim()]
          : [],
      ...orgVisibility,
    });

    revalidateTaskPaths(created.id);
    return { ok: true, taskId: created.id };
  } catch (error) {
    return failure(error);
  }
}

export async function assignAufgabeAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    const assigneeUserId = formData.get("assigneeUserId");
    const assigneeUserIdsRaw = formData.get("assigneeUserIds");

    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }

    let assignees: string[] = [];
    if (typeof assigneeUserIdsRaw === "string" && assigneeUserIdsRaw.trim()) {
      assignees = assigneeUserIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (typeof assigneeUserId === "string" && assigneeUserId.trim()) {
      assignees = [assigneeUserId.trim()];
    }

    await assignTask(ctx, taskId.trim(), assignees);
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createSubtaskAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const parentTaskId = formData.get("parentTaskId");
    const title = formData.get("title");
    const dueAtRaw = formData.get("dueAt");
    const assigneeUserId = formData.get("assigneeUserId");
    const assigneeUserIdsRaw = formData.get("assigneeUserIds");
    const priority = formData.get("priority");

    if (typeof parentTaskId !== "string" || !parentTaskId.trim()) {
      return { ok: false, message: "Parent-Aufgabe fehlt." };
    }

    const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
    const parsedPriority =
      typeof priority === "string" &&
      (validPriorities as readonly string[]).includes(priority)
        ? (priority as TaskPriority)
        : undefined;

    let dueAt: Date | null = null;
    if (typeof dueAtRaw === "string" && dueAtRaw.trim()) {
      dueAt = new Date(`${dueAtRaw}T12:00:00.000Z`);
    }

    let subAssignees: string[] = [];
    if (typeof assigneeUserIdsRaw === "string" && assigneeUserIdsRaw.trim()) {
      subAssignees = assigneeUserIdsRaw
        .split(/[,;\s]+/)
        .map((id) => id.trim())
        .filter(Boolean);
    } else if (typeof assigneeUserId === "string" && assigneeUserId.trim()) {
      subAssignees = [assigneeUserId.trim()];
    }

    await createSubtask(ctx, parentTaskId.trim(), {
      title: typeof title === "string" ? title : "",
      dueAt,
      priority: parsedPriority,
      assigneeUserIds: subAssignees,
    });

    revalidateTaskPaths(parentTaskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createWeeklySeriesAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const title = formData.get("title");
    const timezone = formData.get("timezone");
    const assigneeUserId = formData.get("assigneeUserId");

    if (typeof title !== "string" || !title.trim()) {
      return { ok: false, message: "Titel fehlt." };
    }
    if (typeof timezone !== "string" || !timezone.trim()) {
      return { ok: false, message: "Zeitzone fehlt." };
    }

    await createTaskSeries(ctx, {
      title,
      frequency: "WEEKLY",
      weekday: "SUNDAY",
      intervalCount: 1,
      timezone: timezone.trim(),
      assigneeUserIds:
        typeof assigneeUserId === "string" && assigneeUserId.trim()
          ? [assigneeUserId.trim()]
          : [],
    });

    revalidatePath("/dashboard/aufgaben");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function generateSeriesOccurrencesAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const seriesId = formData.get("seriesId");
    const sid =
      typeof seriesId === "string" && seriesId.trim() ? seriesId.trim() : undefined;
    await generateTaskOccurrences(ctx, sid);
    revalidateSeriesPaths(sid);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function completeAufgabeAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }

    await completeTask(ctx, taskId.trim());
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAufgabeStatusAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    const status = formData.get("status");
    const valid = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }
    if (typeof status !== "string" || !(valid as readonly string[]).includes(status)) {
      return { ok: false, message: "Ungültiger Status." };
    }

    await updateTask(ctx, taskId.trim(), { status: status as TaskStatus });
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

async function loadActionTenantTimeZone(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  return tenant?.timezone ?? "Europe/Zurich";
}

async function parseDeadlineAndRemindersFromForm(
  tenantId: string,
  formData: FormData,
): Promise<
  | {
      dueAt: Date | null;
      reminder1At: Date | null;
      reminder2At: Date | null;
      reminder1PresetKey: string | null;
      reminder2PresetKey: string | null;
    }
  | "invalid_due"
  | "invalid_reminder"
> {
  const timeZone = await loadActionTenantTimeZone(tenantId);
  const dueAt = parseTaskDueAtFromForm({
    dateRaw: formData.get("dueAt")?.toString(),
    timeRaw: formData.get("dueTime")?.toString(),
    timeZone,
  });
  if (dueAt === "invalid") return "invalid_due";

  const reminders = parseTaskReminderFieldsFromForm(formData, timeZone);
  if (reminders === "invalid") return "invalid_reminder";

  return {
    dueAt,
    ...reminders,
  };
}

function parseTaskContextFromForm(formData: FormData): {
  contextType: TaskContextType | null;
  contextId: string | null;
} {
  const typeRaw = formData.get("contextType");
  const idRaw = formData.get("contextId");
  const type =
    typeof typeRaw === "string" && typeRaw.trim() && isSupportedTaskContextType(typeRaw as TaskContextType)
      ? (typeRaw as TaskContextType)
      : null;
  const id = typeof idRaw === "string" && idRaw.trim() ? idRaw.trim() : null;
  if (!type) {
    return { contextType: null, contextId: null };
  }
  if (!id) {
    throw new TaskValidationError("Bitte einen Kontext auswählen oder Kontexttyp entfernen.");
  }
  return { contextType: type, contextId: id };
}

function parseOrgVisibilityFromForm(formData: FormData): {
  orgUnitId?: string | null;
  orgUnitGrantIds?: string[];
  viewerUserGrantIds?: string[];
  visibilityScope?: TaskVisibilityScope;
} {
  if (
    !formData.has("visibilityScope") &&
    !formData.has("orgUnitId") &&
    !formData.has("orgUnitGrantIds") &&
    !formData.has("viewerUserGrantIds")
  ) {
    return {};
  }

  const visibilityRaw = formData.get("visibilityScope");
  const visibilityScope =
    visibilityRaw === null || (typeof visibilityRaw === "string" && !visibilityRaw.trim())
      ? TaskVisibilityScopeEnum.CLUB
      : parseTaskVisibilityScope(visibilityRaw);

  if (!visibilityScope) {
    throw new TaskValidationError("Ungültige Sichtbarkeit.");
  }

  const orgUnitGrantIds = parseIdListFromForm(formData.get("orgUnitGrantIds"));
  const viewerUserGrantIds = parseIdListFromForm(formData.get("viewerUserGrantIds"));

  const orgRaw = formData.get("orgUnitId");
  const orgUnitId =
    typeof orgRaw === "string" && orgRaw.trim()
      ? orgRaw.trim()
      : orgUnitGrantIds[0] ?? null;

  return { orgUnitId, orgUnitGrantIds, viewerUserGrantIds, visibilityScope };
}

function parsePriority(raw: FormDataEntryValue | null): TaskPriority | undefined {
  const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
  if (
    typeof raw === "string" &&
    (validPriorities as readonly string[]).includes(raw)
  ) {
    return raw as TaskPriority;
  }
  return undefined;
}

export async function updateAufgabeContextAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }
    const remove = formData.get("removeContext") === "true";
    const parsed = remove
      ? { contextType: null, contextId: null }
      : parseTaskContextFromForm(formData);
    await updateTask(ctx, taskId.trim(), parsed);
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAufgabeTitleAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    const title = formData.get("title");
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }
    await updateTask(ctx, taskId.trim(), {
      title: typeof title === "string" ? title : "",
    });
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAufgabeDescriptionAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    const description = formData.get("description");
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }
    await updateTask(ctx, taskId.trim(), {
      description: typeof description === "string" ? description : null,
    });
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAufgabePriorityAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    const priority = parsePriority(formData.get("priority"));
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }
    if (!priority) {
      return { ok: false, message: "Ungültige Priorität." };
    }
    await updateTask(ctx, taskId.trim(), { priority });
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAufgabeDueAtAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }

    const schedule = await parseDeadlineAndRemindersFromForm(ctx.tenantId, formData);
    if (schedule === "invalid_due") {
      return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
    }
    if (schedule === "invalid_reminder") {
      return { ok: false, message: "Ungültige Erinnerung." };
    }

    await updateTask(ctx, taskId.trim(), {
      dueAt: schedule.dueAt,
      reminder1At: schedule.reminder1At,
      reminder2At: schedule.reminder2At,
      reminder1PresetKey: schedule.reminder1PresetKey,
      reminder2PresetKey: schedule.reminder2PresetKey,
    });
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelAufgabeAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }
    await cancelTask(ctx, taskId.trim());
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createTaskSeriesAction(
  formData: FormData,
): Promise<AufgabenActionResult & { seriesId?: string }> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const title = formData.get("title");
    const description = formData.get("description");
    const priority = parsePriority(formData.get("priority"));
    const frequency = parseFrequency(formData.get("frequency"));
    const intervalRaw = formData.get("intervalCount");
    const weekday = parseWeekday(formData.get("weekday"));
    const monthDayRaw = formData.get("monthDay");
    const timezone = formData.get("timezone");
    const dueHourRaw = formData.get("dueHour");
    const dueMinuteRaw = formData.get("dueMinute");
    const startsOn = parseStartsOn(formData.get("startsOn"));

    if (typeof title !== "string" || !title.trim()) {
      return { ok: false, message: "Titel fehlt." };
    }
    if (!frequency) {
      return { ok: false, message: "Rhythmus fehlt." };
    }
    if (typeof timezone !== "string" || !timezone.trim()) {
      return { ok: false, message: "Zeitzone fehlt." };
    }
    if (startsOn === "invalid") {
      return { ok: false, message: "Ungültiges Startdatum." };
    }

    const intervalCount =
      typeof intervalRaw === "string" && intervalRaw.trim()
        ? Number(intervalRaw)
        : 1;
    if (!Number.isFinite(intervalCount) || intervalCount < 1) {
      return { ok: false, message: "Ungültiges Intervall." };
    }

    let monthDay: number | null = null;
    if (frequency === "MONTHLY") {
      monthDay =
        typeof monthDayRaw === "string" && monthDayRaw.trim()
          ? Number(monthDayRaw)
          : NaN;
      if (!Number.isFinite(monthDay)) {
        return { ok: false, message: "Monatstag fehlt." };
      }
    }

    const dueHour =
      typeof dueHourRaw === "string" && dueHourRaw.trim() ? Number(dueHourRaw) : 23;
    const dueMinute =
      typeof dueMinuteRaw === "string" && dueMinuteRaw.trim()
        ? Number(dueMinuteRaw)
        : 59;

    const orgVisibility = parseOrgVisibilityFromForm(formData);
    const reminder1PresetKey = parseTaskReminderPresetKey(formData.get("reminder1Preset"));
    const reminder2PresetKey = parseTaskReminderPresetKey(formData.get("reminder2Preset"));
    if (reminder1PresetKey === "invalid" || reminder2PresetKey === "invalid") {
      return { ok: false, message: "Ungültige Serien-Erinnerung." };
    }

    const created = await createTaskSeries(ctx, {
      title,
      description: typeof description === "string" ? description : null,
      priority: priority ?? "NORMAL",
      frequency,
      intervalCount,
      weekday: frequency === "WEEKLY" ? weekday ?? null : null,
      monthDay,
      dueHour,
      dueMinute,
      reminder1PresetKey,
      reminder2PresetKey,
      timezone: timezone.trim(),
      startsOn,
      assigneeUserIds: parseAssigneeIds(formData.get("assigneeUserIds")),
      subtaskTemplates: parseSubtaskTemplatesJson(formData.get("subtaskTemplatesJson")),
      ...orgVisibility,
    });

    await generateTaskOccurrences(ctx, created.id);
    revalidateSeriesPaths(created.id);
    return { ok: true, seriesId: created.id };
  } catch (error) {
    return failure(error);
  }
}

export async function updateTaskSeriesAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const seriesId = formData.get("seriesId");
    if (typeof seriesId !== "string" || !seriesId.trim()) {
      return { ok: false, message: "Serie fehlt." };
    }

    const frequency = parseFrequency(formData.get("frequency"));
    const weekday = parseWeekday(formData.get("weekday"));
    const monthDayRaw = formData.get("monthDay");
    const startsOn = parseStartsOn(formData.get("startsOn"));
    if (startsOn === "invalid") {
      return { ok: false, message: "Ungültiges Startdatum." };
    }

    let monthDay: number | null | undefined;
    if (typeof monthDayRaw === "string" && monthDayRaw.trim()) {
      monthDay = Number(monthDayRaw);
    }

    const intervalRaw = formData.get("intervalCount");
    const intervalCount =
      typeof intervalRaw === "string" && intervalRaw.trim()
        ? Number(intervalRaw)
        : undefined;

    const title = formData.get("title");
    const description = formData.get("description");
    const priority = parsePriority(formData.get("priority"));
    const timezone = formData.get("timezone");
    const dueHourRaw = formData.get("dueHour");
    const dueMinuteRaw = formData.get("dueMinute");
    const subtaskJson = formData.get("subtaskTemplatesJson");

    const orgVisibility =
      formData.has("visibilityScope") ||
      formData.has("orgUnitId") ||
      formData.has("orgUnitGrantIds") ||
      formData.has("viewerUserGrantIds")
      ? parseOrgVisibilityFromForm(formData)
      : {};

    await updateTaskSeries(ctx, seriesId.trim(), {
      title: typeof title === "string" ? title : undefined,
      description: typeof description === "string" ? description : undefined,
      priority,
      frequency,
      intervalCount,
      weekday,
      monthDay,
      timezone: typeof timezone === "string" ? timezone : undefined,
      dueHour:
        typeof dueHourRaw === "string" && dueHourRaw.trim()
          ? Number(dueHourRaw)
          : undefined,
      dueMinute:
        typeof dueMinuteRaw === "string" && dueMinuteRaw.trim()
          ? Number(dueMinuteRaw)
          : undefined,
      startsOn: startsOn === undefined ? undefined : startsOn,
      assigneeUserIds: formData.has("assigneeUserIds")
        ? parseAssigneeIds(formData.get("assigneeUserIds"))
        : undefined,
      subtaskTemplates: formData.has("subtaskTemplatesJson")
        ? parseSubtaskTemplatesJson(subtaskJson)
        : undefined,
      ...orgVisibility,
    });

    revalidateSeriesPaths(seriesId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function pauseTaskSeriesAction(formData: FormData): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };
  try {
    const seriesId = formData.get("seriesId");
    if (typeof seriesId !== "string" || !seriesId.trim()) {
      return { ok: false, message: "Serie fehlt." };
    }
    await pauseTaskSeries(ctx, seriesId.trim());
    revalidateSeriesPaths(seriesId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function resumeTaskSeriesAction(formData: FormData): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };
  try {
    const seriesId = formData.get("seriesId");
    if (typeof seriesId !== "string" || !seriesId.trim()) {
      return { ok: false, message: "Serie fehlt." };
    }
    await resumeTaskSeries(ctx, seriesId.trim());
    await generateTaskOccurrences(ctx, seriesId.trim());
    revalidateSeriesPaths(seriesId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function endTaskSeriesAction(formData: FormData): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };
  try {
    const seriesId = formData.get("seriesId");
    if (typeof seriesId !== "string" || !seriesId.trim()) {
      return { ok: false, message: "Serie fehlt." };
    }
    await endTaskSeries(ctx, seriesId.trim());
    revalidateSeriesPaths(seriesId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAufgabeOrgVisibilityAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const taskId = formData.get("taskId");
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }
    const orgVisibility = parseOrgVisibilityFromForm(formData);
    await updateTask(ctx, taskId.trim(), orgVisibility);
    revalidateTaskPaths(taskId.trim());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createContextualAufgabeAction(
  contextTypeRaw: string,
  contextIdRaw: string,
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  const contextType = contextTypeRaw.trim();
  const contextId = contextIdRaw.trim();
  if (!isSupportedTaskContextType(contextType as TaskContextType)) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }
  if (!contextId) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }

  if (formData.has("contextType") || formData.has("contextId")) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }

  try {
    const title = formData.get("title");
    const description = formData.get("description");
    const priority = parsePriority(formData.get("priority"));
    const schedule = await parseDeadlineAndRemindersFromForm(ctx.tenantId, formData);
    const assigneeRaw = formData.get("assigneeUserIds");

    if (schedule === "invalid_due") {
      return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
    }
    if (schedule === "invalid_reminder") {
      return { ok: false, message: "Ungültige Erinnerung." };
    }

    let assigneeUserIds: string[] = [];
    if (typeof assigneeRaw === "string" && assigneeRaw.trim()) {
      assigneeUserIds = assigneeRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const orgVisibility = parseOrgVisibilityFromForm(formData);

    const created = await createTaskWithContextDefaults(ctx, {
      trustedContext: {
        contextType: contextType as TaskContextType,
        contextId,
      },
      task: {
        title: typeof title === "string" ? title : "",
        description: typeof description === "string" ? description : null,
        priority: priority ?? "NORMAL",
        dueAt: schedule.dueAt,
        reminder1At: schedule.reminder1At,
        reminder2At: schedule.reminder2At,
        reminder1PresetKey: schedule.reminder1PresetKey,
        reminder2PresetKey: schedule.reminder2PresetKey,
        assigneeUserIds,
        ...orgVisibility,
      },
    });

    revalidateTaskPaths(created.id);
    revalidatePath("/dashboard/matchcenter");
    return { ok: true, taskId: created.id };
  } catch (error) {
    return failure(error);
  }
}

export async function createAufgabeFullAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const title = formData.get("title");
    const description = formData.get("description");
    const priority = parsePriority(formData.get("priority"));
    const schedule = await parseDeadlineAndRemindersFromForm(ctx.tenantId, formData);
    const assigneeRaw = formData.get("assigneeUserIds");

    if (schedule === "invalid_due") {
      return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
    }
    if (schedule === "invalid_reminder") {
      return { ok: false, message: "Ungültige Erinnerung." };
    }

    let assigneeUserIds: string[] = [];
    if (typeof assigneeRaw === "string" && assigneeRaw.trim()) {
      assigneeUserIds = assigneeRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const { contextType, contextId } = parseTaskContextFromForm(formData);

    const orgVisibility = parseOrgVisibilityFromForm(formData);

    const created = await createTask(ctx, {
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : null,
      priority: priority ?? "NORMAL",
      dueAt: schedule.dueAt,
      reminder1At: schedule.reminder1At,
      reminder2At: schedule.reminder2At,
      reminder1PresetKey: schedule.reminder1PresetKey,
      reminder2PresetKey: schedule.reminder2PresetKey,
      assigneeUserIds,
      contextType,
      contextId,
      ...orgVisibility,
    });

    revalidateTaskPaths(created.id);
    return { ok: true, taskId: created.id };
  } catch (error) {
    return failure(error);
  }
}

export async function loadTaskTimelineAction(
  taskId: string,
  cursor?: string | null,
  anchorCommentId?: string | null,
): Promise<TaskTimelineActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  try {
    const page =
      anchorCommentId?.trim() && !cursor
        ? await loadTaskTimelinePageForCommentAnchor(ctx, taskId, anchorCommentId.trim())
        : await loadTaskTimelinePage(ctx, taskId, cursor);
    return { ok: true, page };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export async function searchTaskMentionCandidatesAction(
  taskId: string,
  query: string,
): Promise<
  | { ok: true; options: Awaited<ReturnType<typeof searchTaskMentionCandidates>> }
  | { ok: false; message: string }
> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const task = await requireVisibleTask(ctx, taskId);
    const options = await searchTaskMentionCandidates(ctx, task, query);
    return { ok: true, options };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export async function followTaskAction(taskId: string): Promise<TaskFollowActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  try {
    const state = await followTask(ctx, taskId);
    revalidateTaskPaths(taskId);
    return { ok: true, state };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export async function unfollowTaskAction(taskId: string): Promise<TaskFollowActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  try {
    const state = await unfollowTask(ctx, taskId);
    revalidateTaskPaths(taskId);
    return { ok: true, state };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export async function createTaskCommentAction(
  taskId: string,
  body: string,
  mentionedUserIds: string[] = [],
): Promise<TaskCommentActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  try {
    const comment = await createTaskComment(ctx, taskId, body, mentionedUserIds);
    revalidateTaskPaths(taskId);
    return { ok: true, commentId: comment.id };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export async function updateTaskCommentAction(
  taskId: string,
  commentId: string,
  body: string,
  mentionedUserIds: string[] = [],
): Promise<TaskCommentActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  try {
    const comment = await updateTaskComment(ctx, taskId, commentId, body, mentionedUserIds);
    revalidateTaskPaths(taskId);
    return { ok: true, commentId: comment.id };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export async function deleteTaskCommentAction(
  taskId: string,
  commentId: string,
): Promise<TaskCommentActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  try {
    const comment = await deleteTaskComment(ctx, taskId, commentId);
    revalidateTaskPaths(taskId);
    return { ok: true, commentId: comment.id };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export type TaskDocumentReferenceActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type TaskDocumentSearchActionResult =
  | { ok: true; options: WorkspaceDocumentPickerOption[] }
  | { ok: false; message: string };

export async function searchTaskDocumentLinkCandidatesAction(
  taskId: string,
  query: string,
  limit?: number,
): Promise<TaskDocumentSearchActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const options = await searchWorkspaceDocumentsForTaskReferenceLink(
      ctx,
      taskId,
      query,
      limit,
    );
    return { ok: true, options };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export async function linkTaskDocumentAction(
  taskId: string,
  documentId: string,
): Promise<TaskDocumentReferenceActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    await linkTaskDocument(ctx, taskId, documentId);
    revalidateTaskPaths(taskId);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export async function unlinkTaskDocumentAction(
  taskId: string,
  documentId: string,
): Promise<TaskDocumentReferenceActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    await unlinkTaskDocument(ctx, taskId, documentId);
    revalidateTaskPaths(taskId);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) };
  }
}

export type { TaskDocumentReferenceDto };
