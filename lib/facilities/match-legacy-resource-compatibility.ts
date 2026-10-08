/**
 * SCE-PLANNER-UX-08-08C/R1 — legacy Match resource code compatibility.
 *
 * Match operational allocation uses SCE-local Event.pitchCode / dressing codes.
 * Physical identity is FacilityResource.id; codes are presentation + compatibility.
 *
 * On resource rename we:
 *   1. Register the retired code as a tenant-scoped alias (blocks code reuse).
 *   2. Propagate the new code into Match allocation fields (SFV sync never overwrites them).
 *
 * Reads merge current resource codes with aliases so stale stored codes still resolve.
 */

import type { PrismaClient } from "@prisma/client";
import { normalizeFacilityResourceCode } from "@/lib/facilities/facility-resource-reference-guard";

export type MatchLegacyResourceCodeDb = Pick<
  PrismaClient,
  "event" | "facilityResourceCodeAlias" | "facilityResource"
>;

export function normalizeMatchLegacyResourceCode(raw: string | null | undefined): string | null {
  if (raw == null || !raw.trim()) return null;
  return normalizeFacilityResourceCode(raw);
}

export function mergeLegacyMatchCodeToResourceIdMap(
  currentCodeToId: ReadonlyMap<string, string>,
  aliases: ReadonlyArray<{ code: string; facilityResourceId: string }>,
): Map<string, string> {
  const merged = new Map(currentCodeToId);
  for (const alias of aliases) {
    const key = normalizeFacilityResourceCode(alias.code);
    if (!merged.has(key)) {
      merged.set(key, alias.facilityResourceId);
    }
  }
  return merged;
}

export function lookupMatchLegacyResourceId(
  codeToResourceId: ReadonlyMap<string, string>,
  rawCode: string | null | undefined,
): string | undefined {
  const normalized = normalizeMatchLegacyResourceCode(rawCode);
  if (!normalized) return undefined;
  return codeToResourceId.get(normalized);
}

export async function listFacilityResourceCodeAliasesForTenant(
  db: Pick<PrismaClient, "facilityResourceCodeAlias">,
  tenantId: string,
): Promise<Array<{ code: string; facilityResourceId: string }>> {
  return db.facilityResourceCodeAlias.findMany({
    where: { tenantId },
    select: { code: true, facilityResourceId: true },
  });
}

export async function registerFacilityResourceCodeAlias(
  db: Pick<PrismaClient, "facilityResourceCodeAlias">,
  tenantId: string,
  facilityResourceId: string,
  retiredCode: string,
): Promise<void> {
  const code = normalizeFacilityResourceCode(retiredCode);
  if (!code) return;

  await db.facilityResourceCodeAlias.upsert({
    where: { tenantId_code: { tenantId, code } },
    create: { tenantId, facilityResourceId, code },
    update: { facilityResourceId },
  });
}

function eventFieldMatchesRetiredCode(
  value: string | null,
  oldCode: string,
  newCode: string,
): boolean {
  const normalized = normalizeMatchLegacyResourceCode(value);
  return normalized === oldCode && normalized !== newCode;
}

/**
 * Rewrites tenant-scoped Match allocation codes that still carry the retired code.
 * Only touches SCE-local operational fields (never SFV-authoritative match facts).
 */
export async function propagateMatchLegacyResourceCodesForRename(
  db: Pick<PrismaClient, "event">,
  tenantId: string,
  oldCodeRaw: string,
  newCodeRaw: string,
): Promise<number> {
  const oldCode = normalizeFacilityResourceCode(oldCodeRaw);
  const newCode = normalizeFacilityResourceCode(newCodeRaw);
  if (!oldCode || oldCode === newCode) return 0;

  const candidates = await db.event.findMany({
    where: {
      tenantId,
      type: "MATCH",
      OR: [
        { pitchCode: { not: null } },
        { homeDressingRoomCode: { not: null } },
        { awayDressingRoomCode: { not: null } },
      ],
    },
    select: {
      id: true,
      pitchCode: true,
      homeDressingRoomCode: true,
      awayDressingRoomCode: true,
    },
  });

  let updates = 0;
  for (const event of candidates) {
    const data: {
      pitchCode?: string;
      homeDressingRoomCode?: string;
      awayDressingRoomCode?: string;
    } = {};

    if (eventFieldMatchesRetiredCode(event.pitchCode, oldCode, newCode)) {
      data.pitchCode = newCode;
    }
    if (eventFieldMatchesRetiredCode(event.homeDressingRoomCode, oldCode, newCode)) {
      data.homeDressingRoomCode = newCode;
    }
    if (eventFieldMatchesRetiredCode(event.awayDressingRoomCode, oldCode, newCode)) {
      data.awayDressingRoomCode = newCode;
    }

    if (Object.keys(data).length === 0) continue;

    await db.event.update({ where: { id: event.id }, data });
    updates += 1;
  }

  return updates;
}

export async function countMatchLegacyResourceReferences(
  db: Pick<PrismaClient, "event" | "facilityResourceCodeAlias">,
  tenantId: string,
  facilityResourceId: string,
  currentCode: string,
): Promise<number> {
  const aliases = await db.facilityResourceCodeAlias.findMany({
    where: { tenantId, facilityResourceId },
    select: { code: true },
  });

  const codeSet = new Set<string>();
  const normalizedCurrent = normalizeMatchLegacyResourceCode(currentCode);
  if (normalizedCurrent) codeSet.add(normalizedCurrent);
  for (const alias of aliases) {
    const normalized = normalizeMatchLegacyResourceCode(alias.code);
    if (normalized) codeSet.add(normalized);
  }

  if (codeSet.size === 0) return 0;

  const codes = [...codeSet];
  const events = await db.event.findMany({
    where: {
      tenantId,
      type: "MATCH",
      OR: [
        { pitchCode: { in: codes } },
        { homeDressingRoomCode: { in: codes } },
        { awayDressingRoomCode: { in: codes } },
      ],
    },
    select: {
      pitchCode: true,
      homeDressingRoomCode: true,
      awayDressingRoomCode: true,
    },
  });

  return events.filter((event) => {
    const fields = [event.pitchCode, event.homeDressingRoomCode, event.awayDressingRoomCode];
    return fields.some((value) => {
      const normalized = normalizeMatchLegacyResourceCode(value);
      return normalized != null && codeSet.has(normalized);
    });
  }).length;
}

export async function buildMatchLegacyCodeToResourceIdMap(
  db: MatchLegacyResourceCodeDb,
  tenantId: string,
  currentPairs: ReadonlyArray<{ code: string; id: string }>,
): Promise<Map<string, string>> {
  const base = new Map(
    currentPairs.map((row) => [normalizeFacilityResourceCode(row.code), row.id] as const),
  );
  const aliases = await listFacilityResourceCodeAliasesForTenant(db, tenantId);
  return mergeLegacyMatchCodeToResourceIdMap(base, aliases);
}
