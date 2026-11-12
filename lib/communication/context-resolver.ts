/**
 * Communication Context Resolver — Layer 2.5 of the Communication Foundation.
 *
 * Bridges between a DB entity and the variable context needed to render a template.
 * Given a moduleKey + entityId, returns a Record<string, string> that can be
 * passed to renderTemplate() for real-data preview or future delivery.
 *
 * This is a pure DB-to-variable-map function. No AI, no inference.
 * Unknown fields are omitted (template keeps them as {{key}}).
 *
 * Usage:
 *   const ctx = await resolveContext("meeting", meetingId);
 *   const preview = renderTemplate(template.bodyMarkdown, ctx);
 *
 * TODO: Phase B.3.3 — club/tenant context
 *   Add club-level variables (club.name, club.email) from a Tenant/Club config model
 *   once that model exists. For now, these must be passed manually.
 *
 * TODO: Phase B.3.3 — season context
 *   Auto-populate season.* from the current active season.
 *
 * TODO: Phase B.3.3 — recipient context
 *   When templates are sent, recipient.* is populated from the addressee record
 *   at delivery time (not in the resolver, which operates on source entities).
 */

import type { ActorContext } from "@/lib/visibility/actor-context";
import { getMeetingById } from "@/lib/meetings/queries";
import { getTargetById } from "@/lib/targets/queries";
import { getInitiativeById } from "@/lib/initiatives/queries";
import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";

type ContextMap = Record<string, string>;

const STRATEGIC_MODULE_KEYS = new Set([
  "meetings",
  "meeting",
  "targets",
  "target",
  "initiatives",
  "initiative",
]);

function formatSwissDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatSwissTime(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

function meetingFieldsFromRow(meeting: {
  title: string;
  meetingDate: Date;
  location: string | null;
  description: string | null;
}): ContextMap {
  return {
    "meeting.title": meeting.title,
    "meeting.date": formatSwissDate(meeting.meetingDate),
    "meeting.time": formatSwissTime(meeting.meetingDate),
    "meeting.location": meeting.location ?? "",
    "meeting.description": meeting.description ?? "",
  };
}

async function resolveMeetingContext(entityId: string, actor: ActorContext): Promise<ContextMap> {
  const meeting = await getMeetingById(entityId, actor);
  if (!meeting) return {};
  return meetingFieldsFromRow(meeting);
}

async function resolveTargetContext(entityId: string, actor: ActorContext): Promise<ContextMap> {
  const target = await getTargetById(entityId, actor);
  if (!target) return {};
  const CATEGORY_LABELS: Record<string, string> = {
    SPORTLICHE_ENTWICKLUNG: "Sportliche Entwicklung",
    MITGLIEDERWACHSTUM: "Mitgliederwachstum",
    FINANZEN: "Finanzen & Infrastruktur",
    AUSBILDUNG: "Ausbildung",
    MEDIEN_SOZIALES: "Medien & Soziales",
    GOVERNANCE: "Governance",
  };
  return {
    "target.title": target.title,
    "target.category": CATEGORY_LABELS[target.category] ?? target.category,
    "target.period": target.periodLabel ?? target.period,
    "target.description": target.description ?? "",
  };
}

async function resolveInitiativeContext(entityId: string, actor: ActorContext): Promise<ContextMap> {
  const initiative = await getInitiativeById(entityId, actor);
  if (!initiative) return {};
  const STATUS_LABELS: Record<string, string> = {
    PLANNED: "Geplant", IN_PROGRESS: "In Arbeit", ON_TRACK: "On Track",
    ON_HOLD: "Pausiert", COMPLETED: "Abgeschlossen", CANCELLED: "Abgesagt",
  };
  return {
    "initiative.title": initiative.title,
    "initiative.owner": initiative.owner ?? "",
    "initiative.status": STATUS_LABELS[initiative.status] ?? initiative.status,
    "initiative.progress": initiative.progress != null ? `${initiative.progress}%` : "",
    "initiative.dueDate": formatSwissDate(initiative.dueDate),
    "initiative.summary": initiative.summary ?? "",
  };
}

/**
 * Resolve a variable context map from a DB entity.
 *
 * @param moduleKey — which module the entity belongs to ("meeting" | "target" | "initiative")
 * @param entityId  — the DB entity id
 * @returns Record<string, string> ready for renderTemplate()
 */
export async function resolveContext(
  moduleKey: string,
  entityId: string,
  actor: ActorContext,
): Promise<ContextMap> {
  if (!actor.tenantId) return {};

  if (STRATEGIC_MODULE_KEYS.has(moduleKey)) {
    const vlOk = await userHasVereinsleitungWorkspaceAccess(actor.userId, actor.tenantId);
    if (!vlOk) return {};
  }

  switch (moduleKey) {
    case "meetings":
    case "meeting":
      return resolveMeetingContext(entityId, actor);
    case "targets":
    case "target":
      return resolveTargetContext(entityId, actor);
    case "initiatives":
    case "initiative":
      return resolveInitiativeContext(entityId, actor);
    default:
      return {};
  }
}
