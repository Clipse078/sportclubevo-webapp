"use server";

import { revalidatePath } from "next/cache";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import {
  assignTask,
  cancelTask,
  completeTask,
  createSubtask,
  createTask,
  updateTask,
} from "@/lib/tasks/task-service";
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

export type AufgabenActionResult =
  | { ok: true; taskId?: string }
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

    let dueAt: Date | null = null;
    if (typeof dueAtRaw === "string" && dueAtRaw.trim()) {
      dueAt = new Date(`${dueAtRaw}T12:00:00.000Z`);
      if (Number.isNaN(dueAt.getTime())) {
        return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
      }
    }

    const created = await createTask(ctx, {
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : null,
      priority: parsedPriority,
      dueAt,
      assigneeUserIds:
        typeof assigneeUserId === "string" && assigneeUserId.trim()
          ? [assigneeUserId.trim()]
          : [],
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

    await createSubtask(ctx, parentTaskId.trim(), {
      title: typeof title === "string" ? title : "",
      dueAt,
      priority: parsedPriority,
      assigneeUserIds:
        typeof assigneeUserId === "string" && assigneeUserId.trim()
          ? [assigneeUserId.trim()]
          : [],
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

function parseOptionalDueAt(raw: FormDataEntryValue | null): Date | null | "invalid" {
  if (raw === null || (typeof raw === "string" && !raw.trim())) {
    return null;
  }
  if (typeof raw !== "string") return "invalid";
  const dueAt = new Date(`${raw.trim()}T12:00:00.000Z`);
  if (Number.isNaN(dueAt.getTime())) return "invalid";
  return dueAt;
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
    const dueAt = parseOptionalDueAt(formData.get("dueAt"));
    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }
    if (dueAt === "invalid") {
      return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
    }
    await updateTask(ctx, taskId.trim(), { dueAt });
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
      timezone: timezone.trim(),
      startsOn,
      assigneeUserIds: parseAssigneeIds(formData.get("assigneeUserIds")),
      subtaskTemplates: parseSubtaskTemplatesJson(formData.get("subtaskTemplatesJson")),
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

export async function createAufgabeFullAction(
  formData: FormData,
): Promise<AufgabenActionResult> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const title = formData.get("title");
    const description = formData.get("description");
    const priority = parsePriority(formData.get("priority"));
    const dueAt = parseOptionalDueAt(formData.get("dueAt"));
    const assigneeRaw = formData.get("assigneeUserIds");

    if (dueAt === "invalid") {
      return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
    }

    let assigneeUserIds: string[] = [];
    if (typeof assigneeRaw === "string" && assigneeRaw.trim()) {
      assigneeUserIds = assigneeRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const created = await createTask(ctx, {
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : null,
      priority: priority ?? "NORMAL",
      dueAt,
      assigneeUserIds,
    });

    revalidateTaskPaths(created.id);
    return { ok: true, taskId: created.id };
  } catch (error) {
    return failure(error);
  }
}
