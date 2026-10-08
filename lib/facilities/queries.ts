/**
 * lib/facilities/queries.ts
 *
 * Database queries for tenant-scoped Facility and FacilityResource records.
 *
 * These queries power the Admin → Facilities & Resources UI and the
 * canonical display helpers in lib/facilities/display-helpers.ts.
 */

import { prisma } from "@/lib/db/prisma";
import type { FacilityStatus, FacilityType, FacilityResourceType } from "@prisma/client";
import {
  assertFacilityIdentityAvailable,
  assertFacilityResourceCodeAvailable,
  normalizeFacilityResourceCode,
} from "@/lib/facilities/facility-resource-reference-guard";
import {
  propagateMatchLegacyResourceCodesForRename,
  registerFacilityResourceCodeAlias,
} from "@/lib/facilities/match-legacy-resource-compatibility";
import {
  withRequiredCodes,
  type FacilityResourceOption,
} from "@/lib/facilities/resource-options";

// Re-exported so existing importers of lib/facilities/queries can keep using
// a single import path for the canonical option type + compatibility helper,
// even though the pure implementation lives in resource-options.ts (kept
// Prisma-free so it is safe to import from "use client" components too).
export { withRequiredCodes, type FacilityResourceOption };

// ── Read queries ─────────────────────────────────────────────────────────────

/**
 * MASTERDATA-CONSISTENCY-02 — the two live operational allocation groups
 * that used to be backed by static FCA registries (lib/facilities/pitches.ts
 * / lib/facilities/dressing-rooms.ts). Mirrors the FacilityResourceType
 * grouping already established by lib/training/allocation-groups.ts and
 * lib/facilities/availability-service.ts, so "pitch" and "dressing room"
 * mean the same thing everywhere in the app.
 */
export type FacilityResourceGroup = "PITCH_HALL" | "DRESSING_ROOM";

const RESOURCE_TYPES_BY_GROUP: Record<FacilityResourceGroup, FacilityResourceType[]> = {
  PITCH_HALL: ["FULL_PITCH", "HALF_PITCH"],
  DRESSING_ROOM: ["DRESSING_ROOM"],
};

/**
 * Canonical, tenant-scoped, active-only resource options for a live
 * operational selector (MatchCenter pitch/dressing-room assignment,
 * Wochenplan room allocation, Wochenplan Schnellkorrektur).
 *
 * Replaces the static FCA_PITCH_ALLOCATIONS / FCA_DRESSING_ROOMS registries
 * as the source of truth for what can be newly assigned: only active
 * FacilityResource rows belonging to a non-archived Facility are returned.
 *
 * Does NOT include historical/archived codes already referenced by an
 * existing allocation — callers that need to keep an existing allocation
 * visible/selectable should merge those back in via withRequiredCodes().
 */
export async function getActiveResourceOptionsForTenant(
  tenantId: string,
  group: FacilityResourceGroup,
): Promise<FacilityResourceOption[]> {
  const resources = await prisma.facilityResource.findMany({
    where: {
      tenantId,
      type: { in: RESOURCE_TYPES_BY_GROUP[group] },
      status: "ACTIVE",
      facility: { status: "ACTIVE" },
    },
    select: { code: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return resources;
}

/**
 * Batch-resolves active, tenant-scoped FacilityResource rows by allocation
 * code — used to validate submitted codes against canonical master data
 * (e.g. the Wochenplan allocation API) instead of a static FCA `Set`.
 *
 * Tenant-scoped and archived-excluded: a code belonging to a different
 * tenant, or to an archived resource/facility, is never returned — so
 * validation naturally rejects both cross-tenant and archived codes.
 */
export async function getActiveFacilityResourcesByCodesForTenant(
  codes: string[],
  tenantId: string,
): Promise<Map<string, { name: string; type: FacilityResourceType }>> {
  if (codes.length === 0) return new Map();

  const resources = await prisma.facilityResource.findMany({
    where: {
      tenantId,
      code: { in: codes },
      status: "ACTIVE",
      facility: { status: "ACTIVE" },
    },
    select: { code: true, name: true, type: true },
  });

  return new Map(resources.map((r) => [r.code, { name: r.name, type: r.type }]));
}

export async function getFacilitiesForTenant(tenantId: string) {
  return prisma.facility.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      resources: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
}

export async function getFacilityById(id: string, tenantId: string) {
  return prisma.facility.findFirst({
    where: { id, tenantId },
    include: {
      resources: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
}

/**
 * List active (non-archived) resources for a specific facility.
 *
 * Requires both facilityId AND tenantId so the query is always tenant-scoped.
 * Returns null when the facility itself does not exist or belongs to a different tenant.
 */
export async function getFacilityResourcesForFacility(
  facilityId: string,
  tenantId: string,
): Promise<FacilityResourceRow[] | null> {
  const facility = await prisma.facility.findFirst({
    where: { id: facilityId, tenantId },
    include: {
      resources: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!facility) return null;
  return facility.resources;
}

/**
 * Look up a FacilityResource by allocation code for the given tenant.
 * Used by the canonical display helper to resolve tenant-configured labels.
 */
export async function getFacilityResourceByCode(
  code: string,
  tenantId: string,
): Promise<{ name: string } | null> {
  return prisma.facilityResource.findUnique({
    where: { tenantId_code: { tenantId, code } },
    select: { name: true },
  });
}

/**
 * Batch-load resource display names for a set of codes.
 * More efficient than N individual lookups when rendering event lists.
 */
export async function getFacilityResourcesByCodesForTenant(
  codes: string[],
  tenantId: string,
): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map();

  const resources = await prisma.facilityResource.findMany({
    where: {
      tenantId,
      code: { in: codes },
    },
    select: { code: true, name: true },
  });

  return new Map(resources.map((r) => [r.code, r.name]));
}

// ── Types ────────────────────────────────────────────────────────────────────

export type FacilityWithResources = Awaited<
  ReturnType<typeof getFacilitiesForTenant>
>[number];

export type FacilityResourceRow = FacilityWithResources["resources"][number];

/**
 * Resolve display labels for the three fixed pitch row keys used by WochenplanBoard.
 *
 * Looks up tenant-configured FacilityResource names for the base pitch codes.
 * Falls back to provided defaults (typically from the static FCA registry).
 */
export async function getWochenplanPitchRowLabels<K extends string>(
  tenantId: string | null | undefined,
  defaults: Array<{ key: K; label: string }>,
): Promise<Array<{ key: K; label: string }>> {
  if (!tenantId) return defaults;

  const codes = defaults.map((d) => d.key);
  const resources = await prisma.facilityResource.findMany({
    where: { tenantId, code: { in: codes } },
    select: { code: true, name: true },
  });

  const byCode = new Map(resources.map((r) => [r.code, r.name]));

  return defaults.map((d) => ({
    key: d.key,
    label: byCode.get(d.key) ?? d.label,
  }));
}

// ── Write operations ─────────────────────────────────────────────────────────

export async function createFacility(input: {
  tenantId: string;
  name: string;
  type: FacilityType;
  sortOrder?: number;
}) {
  await assertFacilityIdentityAvailable(prisma, input.tenantId, input.name, input.type);

  return prisma.facility.create({
    data: {
      tenantId: input.tenantId,
      name: input.name.trim(),
      type: input.type,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateFacility(
  id: string,
  tenantId: string,
  data: Partial<{ name: string; type: FacilityType; status: FacilityStatus; sortOrder: number }>,
) {
  return prisma.facility.updateMany({
    where: { id, tenantId },
    data,
  });
}

export async function createFacilityResource(input: {
  tenantId: string;
  facilityId: string;
  name: string;
  code: string;
  type: FacilityResourceType;
  sortOrder?: number;
}) {
  const code = normalizeFacilityResourceCode(input.code);
  await assertFacilityResourceCodeAvailable(prisma, input.tenantId, code);

  return prisma.facilityResource.create({
    data: {
      tenantId: input.tenantId,
      facilityId: input.facilityId,
      name: input.name,
      code,
      type: input.type,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateFacilityResource(
  id: string,
  tenantId: string,
  data: Partial<{
    name: string;
    code: string;
    type: FacilityResourceType;
    status: FacilityStatus;
    sortOrder: number;
  }>,
) {
  const patch = { ...data };
  if (typeof patch.code === "string") {
    const newCode = normalizeFacilityResourceCode(patch.code);
    patch.code = newCode;
    await assertFacilityResourceCodeAvailable(prisma, tenantId, newCode, id);

    return prisma.$transaction(async (tx) => {
      const current = await tx.facilityResource.findFirst({
        where: { id, tenantId },
        select: { code: true },
      });
      if (!current) {
        return tx.facilityResource.updateMany({ where: { id, tenantId }, data: patch });
      }

      const previousCode = normalizeFacilityResourceCode(current.code);
      if (previousCode !== newCode) {
        await registerFacilityResourceCodeAlias(tx, tenantId, id, previousCode);
        await propagateMatchLegacyResourceCodesForRename(tx, tenantId, previousCode, newCode);
      }

      return tx.facilityResource.updateMany({
        where: { id, tenantId },
        data: patch,
      });
    });
  }

  return prisma.facilityResource.updateMany({
    where: { id, tenantId },
    data: patch,
  });
}
