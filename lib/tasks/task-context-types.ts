import type { TaskContextType } from "@prisma/client";
import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TASK_CONTEXT_LABELS } from "./management-labels";

/** Context types with a canonical SCE entity and full AUFGABEN-04 integration. */
export const SUPPORTED_TASK_CONTEXT_TYPES = [
  "MATCH",
  "TRAINING",
  "TOURNAMENT",
  "CLUB_EVENT",
  "MEETING",
  "REGISTRATION",
  "TEAM",
  "PERSON",
  "DOCUMENT",
] as const satisfies readonly TaskContextType[];

export type SupportedTaskContextType = (typeof SUPPORTED_TASK_CONTEXT_TYPES)[number];

export function isSupportedTaskContextType(
  type: TaskContextType,
): type is SupportedTaskContextType {
  return (SUPPORTED_TASK_CONTEXT_TYPES as readonly string[]).includes(type);
}

export function taskContextTypeLabel(type: TaskContextType): string {
  return TASK_CONTEXT_LABELS[type];
}

export const TASK_CONTEXT_UNAVAILABLE_LABEL = "Kontext nicht mehr verfügbar";

/** Minimum operational read permission to attach or resolve a context type. */
export function operationalReadPermissionForContext(
  type: TaskContextType,
): string | null {
  switch (type) {
    case "MATCH":
    case "TOURNAMENT":
    case "CLUB_EVENT":
      return PERMISSIONS.EVENTS_VIEW;
    case "TRAINING":
      return PERMISSIONS.TRAININGS_VIEW;
    case "MEETING":
      return PERMISSIONS.MEETINGS_VIEW;
    case "REGISTRATION":
      return PERMISSIONS.REGISTRATIONS_VIEW;
    case "TEAM":
      return PERMISSIONS.TEAMS_VIEW;
    case "PERSON":
      return PERMISSIONS.PEOPLE_VIEW;
    case "DOCUMENT":
      return PERMISSIONS.WORKSPACE_VIEW;
    default:
      return null;
  }
}

export function buildOperationalContextHref(
  type: TaskContextType,
  entity: {
    id: string;
    slug?: string | null;
    tenantKey?: string | null;
  },
): string | null {
  switch (type) {
    case "MATCH":
      return `/dashboard/matchcenter/${encodeURIComponent(entity.id)}`;
    case "TOURNAMENT":
      return `/dashboard/tournamentcenter/${encodeURIComponent(entity.id)}/edit`;
    case "CLUB_EVENT":
      return getVeranstaltungHref(entity.id);
    case "TRAINING":
      return `/dashboard/training/series/${encodeURIComponent(entity.id)}/edit`;
    case "MEETING":
      return entity.slug
        ? `/vereinsleitung/meetings/${encodeURIComponent(entity.slug)}/edit`
        : null;
    case "TEAM":
      return `/dashboard/teams?teamId=${encodeURIComponent(entity.id)}`;
    case "PERSON":
      return `/dashboard/persons/${encodeURIComponent(entity.id)}`;
    case "REGISTRATION":
      return entity.tenantKey
        ? `/tenant/${encodeURIComponent(entity.tenantKey)}/cockpit/registrations/${encodeURIComponent(entity.id)}`
        : null;
    case "DOCUMENT":
      return `/dashboard/workspace?document=${encodeURIComponent(entity.id)}`;
    default:
      return null;
  }
}
