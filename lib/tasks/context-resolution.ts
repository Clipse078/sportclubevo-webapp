import type { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { buildActorContext } from "@/lib/visibility/actor-context";
import { loadOrgUnitIds, loadTargetGroupIds } from "@/lib/org/queries";
import {
  TASK_CONTEXT_UNAVAILABLE_LABEL,
  buildOperationalContextHref,
  taskContextTypeLabel,
} from "./context-registry";
import { resolveWorkspaceDocumentPresentations } from "@/lib/workspace/document-access";
import { canResolveTaskContextDetails } from "./context-access";
import type { TaskServiceContext } from "./types";

export type TaskContextPresentation = {
  typeLabel: string;
  title: string | null;
  subtitle: string | null;
  compactSecondary: string | null;
  href: string | null;
  unavailable: boolean;
};

export type TaskContextRef = {
  contextType: TaskContextType;
  contextId: string;
};

function contextKey(type: TaskContextType, id: string): string {
  return `${type}:${id}`;
}

function formatCompactDateTime(
  value: Date,
  locale: string,
  timeZone: string,
): string {
  const date = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).format(value);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(value);
  return `${date} · ${time}`;
}

function buildCompactSecondary(
  typeLabel: string,
  title: string | null,
  unavailable: boolean,
): string | null {
  if (unavailable) return `${typeLabel} · ${TASK_CONTEXT_UNAVAILABLE_LABEL}`;
  if (!title) return typeLabel;
  return `${typeLabel} · ${title}`;
}

function emptyPresentation(type: TaskContextType): TaskContextPresentation {
  const typeLabel = taskContextTypeLabel(type);
  return {
    typeLabel,
    title: null,
    subtitle: null,
    compactSecondary: typeLabel,
    href: null,
    unavailable: false,
  };
}

function unavailablePresentation(type: TaskContextType): TaskContextPresentation {
  const typeLabel = taskContextTypeLabel(type);
  return {
    typeLabel,
    title: TASK_CONTEXT_UNAVAILABLE_LABEL,
    subtitle: null,
    compactSecondary: buildCompactSecondary(typeLabel, null, true),
    href: null,
    unavailable: true,
  };
}

function restrictedPresentation(type: TaskContextType): TaskContextPresentation {
  const typeLabel = taskContextTypeLabel(type);
  return {
    typeLabel,
    title: null,
    subtitle: null,
    compactSecondary: typeLabel,
    href: null,
    unavailable: false,
  };
}

async function hydrateActorForMeetings(ctx: TaskServiceContext) {
  const [orgUnitIds, targetGroupIds] = await Promise.all([
    loadOrgUnitIds(ctx.userId, ctx.tenantId),
    loadTargetGroupIds(ctx.userId, ctx.tenantId),
  ]);
  return buildActorContext(
    { id: ctx.userId, roleKeys: [], permissionKeys: [...ctx.permissionKeys] },
    orgUnitIds,
    targetGroupIds,
    ctx.tenantId,
  );
}

type ResolvedRow = {
  title: string | null;
  subtitle: string | null;
  href: string | null;
  unavailable: boolean;
};

export async function resolveTaskContextsBatch(
  ctx: TaskServiceContext,
  refs: TaskContextRef[],
  locale: string,
  timeZone: string,
): Promise<Map<string, TaskContextPresentation>> {
  const result = new Map<string, TaskContextPresentation>();
  if (refs.length === 0) return result;

  const byType = new Map<TaskContextType, Set<string>>();
  for (const ref of refs) {
    if (!ref.contextType || !ref.contextId) continue;
    const set = byType.get(ref.contextType) ?? new Set<string>();
    set.add(ref.contextId);
    byType.set(ref.contextType, set);
  }

  const tenantKeyPromise = byType.has("REGISTRATION")
    ? prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { key: true },
      })
    : Promise.resolve(null);

  const meetingActorPromise = byType.has("MEETING")
    ? hydrateActorForMeetings(ctx)
    : Promise.resolve(null);

  const resolvedRows = new Map<string, ResolvedRow>();

  const loads: Promise<void>[] = [];

  if (byType.has("MATCH") || byType.has("TOURNAMENT") || byType.has("CLUB_EVENT")) {
    const eventIds = [
      ...new Set([
        ...(byType.get("MATCH") ?? []),
        ...(byType.get("TOURNAMENT") ?? []),
        ...(byType.get("CLUB_EVENT") ?? []),
      ]),
    ];
    loads.push(
      (async () => {
        const rows = await prisma.event.findMany({
          where: { id: { in: eventIds }, tenantId: ctx.tenantId },
          select: {
            id: true,
            type: true,
            title: true,
            startAt: true,
            allDay: true,
          },
        });
        const rowById = new Map(rows.map((r) => [r.id, r]));

        for (const type of ["MATCH", "TOURNAMENT", "CLUB_EVENT"] as const) {
          const ids = byType.get(type);
          if (!ids) continue;
          const canSee = canResolveTaskContextDetails(ctx, type);
          for (const id of ids) {
            const key = contextKey(type, id);
            const row = rowById.get(id);
            const expectedType =
              type === "CLUB_EVENT" ? "OTHER" : type === "MATCH" ? "MATCH" : "TOURNAMENT";
            if (!row || row.type !== expectedType) {
              resolvedRows.set(key, {
                title: TASK_CONTEXT_UNAVAILABLE_LABEL,
                subtitle: null,
                href: null,
                unavailable: true,
              });
              continue;
            }
            if (!canSee) {
              resolvedRows.set(key, {
                title: null,
                subtitle: null,
                href: null,
                unavailable: false,
              });
              continue;
            }
            const subtitle = formatCompactDateTime(row.startAt, locale, timeZone);
            resolvedRows.set(key, {
              title: row.title,
              subtitle,
              href: buildOperationalContextHref(type, { id: row.id }),
              unavailable: false,
            });
          }
        }
      })(),
    );
  }

  if (byType.has("TRAINING")) {
    const ids = [...(byType.get("TRAINING") ?? [])];
    loads.push(
      (async () => {
        const rows = await prisma.trainingSeries.findMany({
          where: { id: { in: ids }, tenantId: ctx.tenantId },
          select: { id: true, title: true, startsAt: true, endsAt: true },
        });
        const rowById = new Map(rows.map((r) => [r.id, r]));
        const canSee = canResolveTaskContextDetails(ctx, "TRAINING");
        for (const id of ids) {
          const key = contextKey("TRAINING", id);
          const row = rowById.get(id);
          if (!row) {
            resolvedRows.set(key, {
              title: TASK_CONTEXT_UNAVAILABLE_LABEL,
              subtitle: null,
              href: null,
              unavailable: true,
            });
            continue;
          }
          if (!canSee) {
            resolvedRows.set(key, { title: null, subtitle: null, href: null, unavailable: false });
            continue;
          }
          resolvedRows.set(key, {
            title: row.title,
            subtitle: `${row.startsAt}–${row.endsAt}`,
            href: buildOperationalContextHref("TRAINING", { id: row.id }),
            unavailable: false,
          });
        }
      })(),
    );
  }

  if (byType.has("TEAM")) {
    const ids = [...(byType.get("TEAM") ?? [])];
    loads.push(
      (async () => {
        const rows = await prisma.team.findMany({
          where: { id: { in: ids }, tenantId: ctx.tenantId },
          select: { id: true, name: true },
        });
        const rowById = new Map(rows.map((r) => [r.id, r]));
        const canSee = canResolveTaskContextDetails(ctx, "TEAM");
        for (const id of ids) {
          const key = contextKey("TEAM", id);
          const row = rowById.get(id);
          if (!row) {
            resolvedRows.set(key, {
              title: TASK_CONTEXT_UNAVAILABLE_LABEL,
              subtitle: null,
              href: null,
              unavailable: true,
            });
            continue;
          }
          if (!canSee) {
            resolvedRows.set(key, { title: null, subtitle: null, href: null, unavailable: false });
            continue;
          }
          resolvedRows.set(key, {
            title: row.name,
            subtitle: null,
            href: buildOperationalContextHref("TEAM", { id: row.id }),
            unavailable: false,
          });
        }
      })(),
    );
  }

  if (byType.has("PERSON")) {
    const ids = [...(byType.get("PERSON") ?? [])];
    loads.push(
      (async () => {
        const rows = await prisma.person.findMany({
          where: { id: { in: ids }, tenantId: ctx.tenantId },
          select: { id: true, firstName: true, lastName: true, displayName: true },
        });
        const rowById = new Map(rows.map((r) => [r.id, r]));
        const canSee = canResolveTaskContextDetails(ctx, "PERSON");
        for (const id of ids) {
          const key = contextKey("PERSON", id);
          const row = rowById.get(id);
          if (!row) {
            resolvedRows.set(key, {
              title: TASK_CONTEXT_UNAVAILABLE_LABEL,
              subtitle: null,
              href: null,
              unavailable: true,
            });
            continue;
          }
          if (!canSee) {
            resolvedRows.set(key, { title: null, subtitle: null, href: null, unavailable: false });
            continue;
          }
          const title =
            row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim();
          resolvedRows.set(key, {
            title,
            subtitle: null,
            href: buildOperationalContextHref("PERSON", { id: row.id }),
            unavailable: false,
          });
        }
      })(),
    );
  }

  if (byType.has("DOCUMENT")) {
    const ids = [...(byType.get("DOCUMENT") ?? [])];
    loads.push(
      (async () => {
        const [presentations, existenceRows] = await Promise.all([
          resolveWorkspaceDocumentPresentations(ctx, ids),
          prisma.workspaceDocument.findMany({
            where: { id: { in: ids }, tenantId: ctx.tenantId },
            select: { id: true, status: true, archivedAt: true },
          }),
        ]);
        const existenceById = new Map(existenceRows.map((row) => [row.id, row]));
        const canSee = canResolveTaskContextDetails(ctx, "DOCUMENT");
        for (const id of ids) {
          const key = contextKey("DOCUMENT", id);
          const existence = existenceById.get(id);
          if (!existence) {
            resolvedRows.set(key, {
              title: TASK_CONTEXT_UNAVAILABLE_LABEL,
              subtitle: null,
              href: null,
              unavailable: true,
            });
            continue;
          }
          if (existence.archivedAt !== null || existence.status !== "ACTIVE") {
            resolvedRows.set(key, {
              title: TASK_CONTEXT_UNAVAILABLE_LABEL,
              subtitle: null,
              href: null,
              unavailable: true,
            });
            continue;
          }
          const presentation = presentations.get(id);
          if (!canSee || !presentation || presentation.access === "restricted") {
            resolvedRows.set(key, { title: null, subtitle: null, href: null, unavailable: false });
            continue;
          }
          resolvedRows.set(key, {
            title: presentation.title,
            subtitle: presentation.folderBreadcrumb,
            href: presentation.href,
            unavailable: false,
          });
        }
      })(),
    );
  }

  if (byType.has("REGISTRATION")) {
    const ids = [...(byType.get("REGISTRATION") ?? [])];
    loads.push(
      (async () => {
        const tenantKeyRow = await tenantKeyPromise;
        const rows = await prisma.registration.findMany({
          where: { id: { in: ids }, tenantId: ctx.tenantId },
          select: { id: true, firstName: true, lastName: true },
        });
        const rowById = new Map(rows.map((r) => [r.id, r]));
        const canSee = canResolveTaskContextDetails(ctx, "REGISTRATION");
        for (const id of ids) {
          const key = contextKey("REGISTRATION", id);
          const row = rowById.get(id);
          if (!row) {
            resolvedRows.set(key, {
              title: TASK_CONTEXT_UNAVAILABLE_LABEL,
              subtitle: null,
              href: null,
              unavailable: true,
            });
            continue;
          }
          if (!canSee) {
            resolvedRows.set(key, { title: null, subtitle: null, href: null, unavailable: false });
            continue;
          }
          resolvedRows.set(key, {
            title: `${row.firstName} ${row.lastName}`.trim(),
            subtitle: null,
            href: buildOperationalContextHref("REGISTRATION", {
              id: row.id,
              tenantKey: tenantKeyRow?.key ?? null,
            }),
            unavailable: false,
          });
        }
      })(),
    );
  }

  if (byType.has("MEETING")) {
    const ids = [...(byType.get("MEETING") ?? [])];
    loads.push(
      (async () => {
        const actor = await meetingActorPromise;
        const rows = await prisma.meeting.findMany({
          where: { id: { in: ids }, tenantId: ctx.tenantId },
          select: {
            id: true,
            slug: true,
            title: true,
            meetingDate: true,
            visibilityScope: true,
            createdByUserId: true,
            visibleRoleRefs: true,
            visibleUserRefs: true,
            visibleTeamRefs: true,
            visibleOrgUnitRefs: true,
            visiblePersonRefs: true,
            visibleTargetGroupRefs: true,
          },
        });
        const rowById = new Map(rows.map((r) => [r.id, r]));
        const canSeeModule = canResolveTaskContextDetails(ctx, "MEETING");
        for (const id of ids) {
          const key = contextKey("MEETING", id);
          const row = rowById.get(id);
          if (!row) {
            resolvedRows.set(key, {
              title: TASK_CONTEXT_UNAVAILABLE_LABEL,
              subtitle: null,
              href: null,
              unavailable: true,
            });
            continue;
          }
          if (!canSeeModule || !actor || !canSeeMeeting(row, actor)) {
            resolvedRows.set(key, { title: null, subtitle: null, href: null, unavailable: false });
            continue;
          }
          resolvedRows.set(key, {
            title: row.title,
            subtitle: formatCompactDateTime(row.meetingDate, locale, timeZone),
            href: buildOperationalContextHref("MEETING", { id: row.id, slug: row.slug }),
            unavailable: false,
          });
        }
      })(),
    );
  }

  await Promise.all(loads);

  for (const ref of refs) {
    const typeLabel = taskContextTypeLabel(ref.contextType);
    const key = contextKey(ref.contextType, ref.contextId);
    const row = resolvedRows.get(key);
    if (!row) {
      if (!canResolveTaskContextDetails(ctx, ref.contextType)) {
        result.set(key, restrictedPresentation(ref.contextType));
      } else {
        result.set(key, unavailablePresentation(ref.contextType));
      }
      continue;
    }
    result.set(key, {
      typeLabel,
      title: row.title,
      subtitle: row.subtitle,
      compactSecondary: buildCompactSecondary(typeLabel, row.unavailable ? null : row.title, row.unavailable),
      href: row.href,
      unavailable: row.unavailable,
    });
  }

  return result;
}

export async function resolveTaskContextPresentation(
  ctx: TaskServiceContext,
  contextType: TaskContextType | null,
  contextId: string | null,
  locale: string,
  timeZone: string,
): Promise<TaskContextPresentation | null> {
  if (!contextType || !contextId) return null;
  const map = await resolveTaskContextsBatch(
    ctx,
    [{ contextType, contextId }],
    locale,
    timeZone,
  );
  return map.get(contextKey(contextType, contextId)) ?? emptyPresentation(contextType);
}
