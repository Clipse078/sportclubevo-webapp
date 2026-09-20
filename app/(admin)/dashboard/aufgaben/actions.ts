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
import {
  createTaskSeries,
  generateTaskOccurrences,
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
    await generateTaskOccurrences(
      ctx,
      typeof seriesId === "string" && seriesId.trim() ? seriesId.trim() : undefined,
    );
    revalidatePath("/dashboard/aufgaben");
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
