"use server";

import type { TaskContextType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  createMeetingTraktandumTask,
  createMeetingTraktandumTaskForDecision,
  getAgendaLinkedTaskSummaryById,
} from "@/lib/meetings/meeting-traktandum-tasks";
import type { AgendaLinkedTaskSummary } from "@/lib/meetings/agenda-item-ergebnisse";
import { parseTaskReminderFieldsFromForm } from "@/lib/tasks/parse-task-reminder-form";
import { parseTaskDueAtFromForm } from "@/lib/tasks/task-reminder-schedule";
import { parseTaskVisibilityScope } from "@/lib/tasks/task-org-mutation-policy";
import { parseIdListFromForm } from "@/lib/tasks/task-access-grants";
import { prisma } from "@/lib/db/prisma";

export type TraktandumAufgabeCreatedSummary = {
  id: string;
  title: string;
  status: AgendaLinkedTaskSummary["status"];
  dueAt: string | null;
  assigneeLabel: string | null;
  agendaItemId: string;
  decisionId: string | null;
  createdAt: string;
};

export type TraktandumAufgabeActionResult =
  | { ok: true; taskId: string; deduplicated?: boolean; summary: TraktandumAufgabeCreatedSummary }
  | { ok: false; message: string };

function serializeAgendaLinkedTaskSummary(row: AgendaLinkedTaskSummary): TraktandumAufgabeCreatedSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    assigneeLabel: row.assigneeLabel,
    agendaItemId: row.agendaItemId,
    decisionId: row.decisionId,
    createdAt: row.createdAt.toISOString(),
  };
}

function parsePriority(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (value === "LOW" || value === "NORMAL" || value === "HIGH" || value === "URGENT") return value;
  return undefined;
}

export async function createTraktandumAufgabeAction(input: {
  meetingId: string;
  agendaItemId: string;
  contextType: TaskContextType;
  contextId: string;
  clientRequestId: string;
  formData: FormData;
}): Promise<TraktandumAufgabeActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Nicht angemeldet." };

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const title = input.formData.get("title");
  if (typeof title !== "string" || !title.trim()) {
    return { ok: false, message: "Titel ist erforderlich." };
  }

  const visibility = parseTaskVisibilityScope(input.formData.get("visibilityScope"));
  const orgUnitGrantIds = parseIdListFromForm(input.formData.get("orgUnitGrantIds"));
  if (visibility === "ORG_UNIT" && orgUnitGrantIds.length === 0) {
    return { ok: false, message: "Bitte mindestens eine Organisationseinheit wählen." };
  }

  const assigneeRaw = input.formData.get("assigneeUserIds");
  const assigneeUserIds =
    typeof assigneeRaw === "string" && assigneeRaw.trim()
      ? assigneeRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const tenantId = actor.tenantId;
  if (!tenantId) return { ok: false, message: "Nicht angemeldet." };

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const timeZone = tenant?.timezone ?? "Europe/Zurich";
  const dueAt = parseTaskDueAtFromForm({
    dateRaw: input.formData.get("dueAt")?.toString(),
    timeRaw: input.formData.get("dueTime")?.toString(),
    timeZone,
  });
  if (dueAt === "invalid") return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
  const reminders = parseTaskReminderFieldsFromForm(input.formData, timeZone);
  if (reminders === "invalid") return { ok: false, message: "Ungültige Erinnerung." };

  const descriptionRaw = input.formData.get("description");
  const payload = {
    title,
    description: typeof descriptionRaw === "string" ? descriptionRaw : null,
    dueAt: dueAt ? dueAt.toISOString() : null,
    priority: parsePriority(input.formData.get("priority")),
    orgUnitId: visibility === "ORG_UNIT" ? orgUnitGrantIds[0] ?? null : null,
    assigneeUserIds,
    idempotencyKey: input.clientRequestId,
    clientRequestId: input.clientRequestId,
  };

  try {
    const result =
      input.contextType === "MEETING_DECISION"
        ? await createMeetingTraktandumTaskForDecision(
            actor,
            input.meetingId,
            input.agendaItemId,
            input.contextId,
            payload,
          )
        : await createMeetingTraktandumTask(actor, input.meetingId, input.agendaItemId, payload);

    const decisionId = input.contextType === "MEETING_DECISION" ? input.contextId : null;
    const summary = await getAgendaLinkedTaskSummaryById(
      actor,
      input.meetingId,
      input.agendaItemId,
      result.taskId,
      decisionId,
    );
    if (!summary) {
      return { ok: false, message: "Aufgabe wurde erstellt, konnte aber nicht geladen werden." };
    }

    revalidatePath(`/vereinsleitung/meetings/${input.meetingId}`);
    revalidatePath("/dashboard/aufgaben");
    return {
      ok: true,
      taskId: result.taskId,
      deduplicated: result.deduplicated,
      summary: serializeAgendaLinkedTaskSummary(summary),
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Aufgabe konnte nicht erstellt werden." };
  }
}