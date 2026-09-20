"use server";

import { revalidatePath } from "next/cache";
import type { TaskPriority } from "@prisma/client";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import {
  assignTask,
  completeTask,
  createSubtask,
  createTask,
} from "@/lib/tasks/task-service";
import {
  createTaskSeries,
  generateTaskOccurrences,
} from "@/lib/tasks/task-series-service";
import {
  TaskForbiddenError,
  TaskNotFoundError,
  TaskValidationError,
} from "@/lib/tasks/errors";

export type AufgabenActionResult =
  | { ok: true }
  | { ok: false; message: string };

function failure(error: unknown): AufgabenActionResult {
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

    await createTask(ctx, {
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : null,
      priority: parsedPriority,
      dueAt,
      assigneeUserIds:
        typeof assigneeUserId === "string" && assigneeUserId.trim()
          ? [assigneeUserId.trim()]
          : [],
    });

    revalidatePath("/dashboard/aufgaben");
    revalidatePath("/dashboard");
    return { ok: true };
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

    if (typeof taskId !== "string" || !taskId.trim()) {
      return { ok: false, message: "Aufgabe fehlt." };
    }

    const assignees =
      typeof assigneeUserId === "string" && assigneeUserId.trim()
        ? [assigneeUserId.trim()]
        : [];

    await assignTask(ctx, taskId.trim(), assignees);
    revalidatePath("/dashboard/aufgaben");
    revalidatePath("/dashboard");
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

    revalidatePath("/dashboard/aufgaben");
    revalidatePath("/dashboard");
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
    revalidatePath("/dashboard/aufgaben");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
