/**
 * AUFGABEN-06A — Map Task audit rows and comments to user-facing German timeline entries.
 */

import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  TASK_CONTEXT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "./management-labels";
import type { TaskCommentDto } from "./task-comment-enrichment";
import type { TaskTimelineEntryDto } from "./task-timeline-types";

type AuditRow = {
  id: string;
  actorUserId: string | null;
  action: string;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: Date;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function actorLabel(actorName: string): string {
  return actorName.trim() || "Unbekannt";
}

function formatStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return TASK_STATUS_LABELS[value as TaskStatus] ?? value;
}

function formatPriority(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return TASK_PRIORITY_LABELS[value as TaskPriority] ?? value;
}

function formatVisibility(value: unknown): string | null {
  if (value === "CLUB") return "Verein";
  if (value === "ORG_UNIT") return "Organisationseinheit";
  if (value === "ASSIGNEES_ONLY") return "Nur Verantwortliche";
  return typeof value === "string" ? value : null;
}

function formatContextType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return TASK_CONTEXT_LABELS[value as keyof typeof TASK_CONTEXT_LABELS] ?? value;
}

function formatDueAt(value: unknown): string | null {
  if (value === null) return "Keine Frist";
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return null;
}

function diffTaskUpdated(before: JsonRecord | null, after: JsonRecord | null): string[] {
  const details: string[] = [];
  if (!before || !after) return details;

  if (before.title !== after.title && typeof after.title === "string") {
    details.push(`Titel geändert`);
  }
  if (before.status !== after.status) {
    const label = formatStatus(after.status);
    if (label) details.push(`Status: ${label}`);
  }
  if (before.priority !== after.priority) {
    const label = formatPriority(after.priority);
    if (label) details.push(`Priorität: ${label}`);
  }
  if (before.dueAt !== after.dueAt) {
    details.push("Frist geändert");
  }
  if (
    before.reminder1At !== after.reminder1At ||
    before.reminder2At !== after.reminder2At ||
    before.reminder1PresetKey !== after.reminder1PresetKey ||
    before.reminder2PresetKey !== after.reminder2PresetKey
  ) {
    details.push("Erinnerungen geändert");
  }
  if (before.contextType !== after.contextType || before.contextId !== after.contextId) {
    const ctxLabel = formatContextType(after.contextType);
    details.push(ctxLabel ? `Kontext: ${ctxLabel}` : "Kontext geändert");
  }
  if (
    before.orgUnitId !== after.orgUnitId ||
    before.visibilityScope !== after.visibilityScope
  ) {
    const vis = formatVisibility(after.visibilityScope);
    if (vis) details.push(`Sichtbarkeit: ${vis}`);
    else details.push("Organisation/Sichtbarkeit geändert");
  }

  return details;
}

function formatAssigneeSentence(
  actorName: string,
  assigneeUserIds: unknown,
  displayByUserId: Map<string, string>,
): string {
  const ids = Array.isArray(assigneeUserIds)
    ? assigneeUserIds.filter((id): id is string => typeof id === "string")
    : [];
  if (ids.length === 0) {
    return `${actorLabel(actorName)} hat die Zuweisung entfernt.`;
  }
  if (ids.length === 1) {
    const name = displayByUserId.get(ids[0]!) ?? "Unbekannt";
    return `${actorLabel(actorName)} hat die Aufgabe ${name} zugewiesen.`;
  }
  return `${actorLabel(actorName)} hat die Aufgabe aktualisiert (${ids.length} Verantwortliche).`;
}

export function mapAuditLogToTimelineEntry(
  row: AuditRow,
  actorDisplayName: string,
  assigneeDisplayByUserId: Map<string, string>,
): TaskTimelineEntryDto {
  const actorName = actorLabel(actorDisplayName);
  const before = asRecord(row.beforeJson);
  const after = asRecord(row.afterJson);

  let title: string;
  const details: string[] = [];

  switch (row.action) {
    case "TASK_CREATED":
      title = `${actorName} hat die Aufgabe erstellt.`;
      break;
    case "TASK_COMPLETED":
      title = `${actorName} hat die Aufgabe abgeschlossen.`;
      break;
    case "TASK_CANCELLED":
      title = `${actorName} hat die Aufgabe abgebrochen.`;
      break;
    case "TASK_ASSIGNED":
      title = formatAssigneeSentence(actorName, after?.assigneeUserIds, assigneeDisplayByUserId);
      break;
    case "TASK_UPDATED": {
      title = `${actorName} hat die Aufgabe aktualisiert.`;
      const changeDetails = diffTaskUpdated(before, after);
      if (before?.dueAt !== after?.dueAt && changeDetails.includes("Frist geändert")) {
        const dueLabel = formatDueAt(after?.dueAt);
        if (dueLabel) {
          details.push(`${actorName} hat die Frist geändert (${dueLabel}).`);
        } else {
          details.push(`${actorName} hat die Frist geändert.`);
        }
      }
      for (const line of changeDetails) {
        if (line !== "Frist geändert") details.push(line);
      }
      break;
    }
    case "TASK_OCCURRENCE_GENERATED":
      title = `${actorName} hat einen Serientermin erzeugt.`;
      break;
    default:
      title = `${actorName} hat die Aufgabe bearbeitet.`;
      break;
  }

  return {
    id: `audit:${row.id}`,
    kind: "AUDIT",
    occurredAt: row.createdAt.toISOString(),
    actor: {
      userId: row.actorUserId,
      displayName: actorName,
    },
    title,
    body: null,
    isEdited: false,
    isDeleted: false,
    details,
  };
}

export function mapCommentToTimelineEntry(comment: TaskCommentDto): TaskTimelineEntryDto {
  return {
    id: `comment:${comment.id}`,
    kind: "COMMENT",
    occurredAt: comment.createdAt,
    actor: {
      userId: comment.authorUserId,
      displayName: comment.authorDisplayName,
    },
    title: null,
    body: comment.isDeleted ? null : comment.body,
    isEdited: comment.isEdited,
    isDeleted: comment.isDeleted,
    details: [],
  };
}

/** Strip raw audit payloads — regression helper for tests. */
export function timelineEntryHasRawAuditPayload(entry: TaskTimelineEntryDto): boolean {
  const serialized = JSON.stringify(entry);
  return serialized.includes("beforeJson") || serialized.includes("afterJson");
}
