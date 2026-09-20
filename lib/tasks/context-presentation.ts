import type { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TASK_CONTEXT_LABELS } from "./management-labels";

export type TaskContextPresentation = {
  typeLabel: string;
  title: string | null;
  href: string | null;
};

export function taskContextTypeLabel(type: TaskContextType): string {
  return TASK_CONTEXT_LABELS[type];
}

function safeMatchHref(eventId: string): string {
  return `/dashboard/matchcenter/${eventId}`;
}

function safeTournamentHref(eventId: string): string {
  return `/dashboard/tournamentcenter/${eventId}/edit`;
}

function safeTrainingSeriesHref(seriesId: string): string {
  return `/dashboard/training/series/${seriesId}/edit`;
}

function safePersonHref(personId: string): string {
  return `/dashboard/persons/${personId}`;
}

function safeTeamHref(teamId: string): string {
  return `/dashboard/teams?teamId=${encodeURIComponent(teamId)}`;
}

export async function resolveTaskContextPresentation(
  tenantId: string,
  contextType: TaskContextType | null,
  contextId: string | null,
): Promise<TaskContextPresentation | null> {
  if (!contextType || !contextId) return null;

  const typeLabel = taskContextTypeLabel(contextType);

  switch (contextType) {
    case "MATCH": {
      const row = await prisma.event.findFirst({
        where: { id: contextId, tenantId, type: "MATCH" },
        select: { id: true, title: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return {
        typeLabel,
        title: row.title,
        href: safeMatchHref(row.id),
      };
    }
    case "TOURNAMENT": {
      const row = await prisma.event.findFirst({
        where: { id: contextId, tenantId, type: "TOURNAMENT" },
        select: { id: true, title: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return {
        typeLabel,
        title: row.title,
        href: safeTournamentHref(row.id),
      };
    }
    case "CLUB_EVENT": {
      const row = await prisma.event.findFirst({
        where: { id: contextId, tenantId, type: "OTHER" },
        select: { id: true, title: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return { typeLabel, title: row.title, href: null };
    }
    case "TRAINING": {
      const row = await prisma.trainingSeries.findFirst({
        where: { id: contextId, tenantId },
        select: { id: true, title: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return {
        typeLabel,
        title: row.title,
        href: safeTrainingSeriesHref(row.id),
      };
    }
    case "MEETING": {
      const row = await prisma.meeting.findFirst({
        where: { id: contextId, tenantId },
        select: { id: true, title: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return { typeLabel, title: row.title, href: null };
    }
    case "REGISTRATION": {
      const row = await prisma.registration.findFirst({
        where: { id: contextId, tenantId },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return {
        typeLabel,
        title: `${row.firstName} ${row.lastName}`.trim(),
        href: null,
      };
    }
    case "TEAM": {
      const row = await prisma.team.findFirst({
        where: { id: contextId, tenantId },
        select: { id: true, name: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return {
        typeLabel,
        title: row.name,
        href: safeTeamHref(row.id),
      };
    }
    case "PERSON": {
      const row = await prisma.person.findFirst({
        where: { id: contextId, tenantId },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return {
        typeLabel,
        title: `${row.firstName} ${row.lastName}`.trim(),
        href: safePersonHref(row.id),
      };
    }
    case "DOCUMENT": {
      const row = await prisma.workspaceDocument.findFirst({
        where: { id: contextId, tenantId },
        select: { id: true, name: true },
      });
      if (!row) return { typeLabel, title: null, href: null };
      return { typeLabel, title: row.name, href: null };
    }
    default:
      return { typeLabel, title: null, href: null };
  }
}
