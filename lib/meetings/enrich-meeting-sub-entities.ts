/**
 * Resolve tenant-scoped person display names for meeting sub-entities.
 */

import { prisma } from "@/lib/db/prisma";
import {
  looksLikeOpaquePersonId,
  personLabelFromRecord,
  resolveStoredPersonDisplayName,
} from "@/lib/meetings/meeting-person-display";
import type { MeetingSubEntities } from "@/lib/meetings/meeting-sub-entities-types";

async function loadPersonLabels(
  tenantId: string,
  personIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(personIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const rows = await prisma.person.findMany({
    where: { tenantId, id: { in: unique }, isActive: true },
    select: { id: true, displayName: true, firstName: true, lastName: true },
  });

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.id, personLabelFromRecord(row));
  }
  return map;
}

function collectPersonIds(entities: MeetingSubEntities): string[] {
  const ids: string[] = [];
  for (const item of entities.agendaItems) {
    if (item.ownerPersonId) ids.push(item.ownerPersonId);
  }
  for (const d of entities.decisions) {
    if (d.ownerPersonId) ids.push(d.ownerPersonId);
  }
  for (const a of entities.actions) {
    if (a.ownerPersonId) ids.push(a.ownerPersonId);
  }
  for (const p of entities.participants) {
    if (p.personId) ids.push(p.personId);
  }
  return ids;
}

export async function enrichMeetingSubEntitiesWithPersonLabels(
  tenantId: string,
  entities: MeetingSubEntities,
): Promise<MeetingSubEntities> {
  const labels = await loadPersonLabels(tenantId, collectPersonIds(entities));

  return {
    agendaItems: entities.agendaItems.map((item) => {
      const resolved = item.ownerPersonId ? labels.get(item.ownerPersonId) : null;
      return {
        ...item,
        owner: resolveStoredPersonDisplayName({
          name: item.owner,
          personId: item.ownerPersonId,
          resolvedLabel: resolved,
        }),
      };
    }),
    decisions: entities.decisions.map((d) => {
      const resolved = d.ownerPersonId ? labels.get(d.ownerPersonId) : null;
      return {
        ...d,
        owner: resolveStoredPersonDisplayName({
          name: d.owner,
          personId: d.ownerPersonId,
          resolvedLabel: resolved,
        }),
      };
    }),
    actions: entities.actions.map((a) => {
      const resolved = a.ownerPersonId ? labels.get(a.ownerPersonId) : null;
      return {
        ...a,
        owner: resolveStoredPersonDisplayName({
          name: a.owner,
          personId: a.ownerPersonId,
          resolvedLabel: resolved,
        }),
      };
    }),
    participants: entities.participants.map((p) => {
      const resolved = p.personId ? labels.get(p.personId) : null;
      let name = resolveStoredPersonDisplayName({
        name: p.name,
        personId: p.personId,
        resolvedLabel: resolved,
      });
      if (!name && p.personId && looksLikeOpaquePersonId(p.personId)) {
        name = resolved ?? null;
      }
      return { ...p, name: name ?? p.name };
    }),
  };
}
