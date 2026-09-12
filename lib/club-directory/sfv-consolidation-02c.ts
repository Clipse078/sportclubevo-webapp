/**
 * CLUB-DIRECTORY-02C — Shared SFV club consolidation inventory, plan, and
 * backup-snapshot logic for the canonical-club backfill (see
 * scripts/club-directory-02c-sfv-consolidation.ts for the CLI entrypoint).
 *
 * STAGE ops routes import this module — not the script — so maintenance-only
 * filesystem helpers (e.g. local `.tmp/` backups) stay out of the Next.js
 * production dependency graph.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { pathToFileURL } from "url";

import { buildProviderClubIdIndex } from "@/lib/integrations/sfv/sync/club-identity";
import { chooseCanonicalClubId, chooseLogoDonor } from "@/lib/club-directory/consolidation-service";
import { fetchTeamList, fetchClubRanking } from "@/lib/integrations/sfv/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROVIDER = "SFV";
export const EXECUTE_CONFIRMATION = "CONSOLIDATE-CLUB-DIRECTORY";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TenantSfvContext = {
  tenantId: string;
  tenantKey: string;
  clubId: number;
  seasonId: number;
  organisationId: number | null;
};

export type DuplicateGroup = {
  providerClubId: number;
  distinctClubIds: string[];
  teamCount: number;
  providerTeamIds: number[];
};

export type TenantInventory = {
  tenant: TenantSfvContext;
  resolvedTeamCount: number;
  duplicateGroups: DuplicateGroup[];
};

export type GroupPlan = {
  providerClubId: number;
  canonicalClubId: string;
  clubsToArchive: string[];
  teamsToMove: number;
  logoAdoptedFromClubId: string | null;
};

export type TenantPlan = {
  tenant: TenantSfvContext;
  groups: GroupPlan[];
};

// ---------------------------------------------------------------------------
// Pure classification (no DB/network access — unit-testable in isolation)
// ---------------------------------------------------------------------------

export type RawTeamMappingRow = {
  providerTeamId: number;
  externalClubId: string;
};

/**
 * Groups mapping rows by resolved providerClubId and reports every group
 * whose teams currently span more than one distinct ExternalClub.
 */
export function findDuplicateGroups(
  rows: readonly RawTeamMappingRow[],
  resolvedClubIdsByTeamId: ReadonlyMap<number, number>,
): DuplicateGroup[] {
  const groups = new Map<number, RawTeamMappingRow[]>();
  for (const row of rows) {
    const providerClubId = resolvedClubIdsByTeamId.get(row.providerTeamId);
    if (providerClubId === undefined) continue;
    const list = groups.get(providerClubId);
    if (list) {
      list.push(row);
    } else {
      groups.set(providerClubId, [row]);
    }
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [providerClubId, groupRows] of groups) {
    const distinctClubIds = [...new Set(groupRows.map((r) => r.externalClubId))].sort();
    if (distinctClubIds.length > 1) {
      duplicates.push({
        providerClubId,
        distinctClubIds,
        teamCount: groupRows.length,
        providerTeamIds: groupRows.map((r) => r.providerTeamId).sort((a, b) => a - b),
      });
    }
  }

  return duplicates.sort((a, b) => a.providerClubId - b.providerClubId);
}

/**
 * Builds the exact merge plan for one duplicate group, reusing the SAME
 * pure decision functions the real (mutating) service uses — see module
 * doc header. Read-only: takes already-loaded club rows, decides nothing
 * by itself beyond what those shared functions decide.
 */
export function buildGroupPlan(
  group: DuplicateGroup,
  clubRows: readonly { id: string; logoUrl: string | null; createdAt: Date; archivedAt: Date | null }[],
  preferredClubId: string | null,
): GroupPlan {
  const canonicalClubId = chooseCanonicalClubId(clubRows, preferredClubId);
  const canonicalClub = clubRows.find((c) => c.id === canonicalClubId)!;
  const losingClubs = clubRows.filter((c) => c.id !== canonicalClubId);
  const donor = chooseLogoDonor(canonicalClub, losingClubs);

  return {
    providerClubId: group.providerClubId,
    canonicalClubId,
    clubsToArchive: losingClubs.map((c) => c.id),
    teamsToMove: group.teamCount - group.distinctClubIds.filter((id) => id === canonicalClubId).length,
    logoAdoptedFromClubId: donor?.donorClubId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Environment helpers (shared conventions with prior scripts)
// ---------------------------------------------------------------------------

export function detectEnvironment(url: string | undefined): string {
  if (!url) return "UNKNOWN";
  const l = url.toLowerCase();
  if (l.includes("prod")) return "PROD";
  if (l.includes("stage")) return "STAGE";
  if (l.includes("localhost") || l.includes("127.0.0.1")) return "LOCAL";
  return "EXTERNAL";
}

export function maskUrl(url: string | undefined): string {
  if (!url) return "(not set)";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username || "(no user)"}:***@${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url.replace(/:[^@/]*@/, ":***@");
  }
}

export function createPrismaClient(connectionString: string): { prisma: PrismaClient; pool: Pool } {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

/** See scripts/team-sfv-mapping-01-fca-reconciliation.ts for why this exists
 * instead of a raw `new URL(...)` comparison (Windows path handling). */
export function isCliEntrypoint(
  argv1: string | undefined,
  moduleUrl: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (!argv1) return false;
  try {
    return pathToFileURL(argv1, { windows: platform === "win32" }).href === moduleUrl;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Tenant discovery + data loading
// ---------------------------------------------------------------------------

export async function resolveTenantContexts(
  prisma: PrismaClient,
  tenantKeyFilter?: string,
): Promise<TenantSfvContext[]> {
  const configs = await prisma.tenantSfvConfig.findMany({
    where: {
      enabled: true,
      ...(tenantKeyFilter ? { tenant: { key: tenantKeyFilter } } : {}),
    },
    select: {
      tenantId: true,
      clubId: true,
      defaultSeasonId: true,
      organisationId: true,
      tenant: { select: { key: true } },
    },
  });

  return configs.map((c) => ({
    tenantId: c.tenantId,
    tenantKey: c.tenant.key,
    clubId: c.clubId,
    seasonId: c.defaultSeasonId,
    organisationId: c.organisationId,
  }));
}

export type TenantProviderClubIdIndex = {
  indexByTeamId: ReadonlyMap<number, number>;
};

/**
 * Fetches this tenant's own team list (`fetchTeamList`) and club ranking
 * (`fetchClubRanking`) from SFV EXACTLY ONCE and builds the resulting
 * `providerTeamId -> providerClubId` identity index — the single live-SFV
 * step `loadTenantInventory()` below performs internally.
 *
 * Exported separately (as well as being used internally by
 * `loadTenantInventory`) so a caller that also needs to feed this EXACT
 * index into a mutation path can do so from the SAME fetch, instead of
 * calling `loadTenantInventory()` again (which would re-fetch SFV a second
 * time). See app/api/ops/club-directory-02c-sfv-consolidation-execute/route.ts
 * — the only caller that needs this — for why that TOCTOU-avoidance matters:
 * regenerating a plan and then executing against a SECOND, independently
 * fetched SFV snapshot would let the executed identity map silently drift
 * from the exact map the regenerated/fingerprinted plan was built from.
 */
export async function resolveProviderClubIdIndex(
  tenant: TenantSfvContext,
): Promise<TenantProviderClubIdIndex> {
  const [ownTeams, rankingEntries] = await Promise.all([
    fetchTeamList({
      SeasonId: tenant.seasonId,
      ClubId: tenant.clubId,
      ...(tenant.organisationId !== null ? { OrganisationId: tenant.organisationId } : {}),
    }),
    fetchClubRanking({
      SeasonId: tenant.seasonId,
      ClubId: tenant.clubId,
      ...(tenant.organisationId !== null ? { OrganisationId: tenant.organisationId } : {}),
    }),
  ]);

  const { indexByTeamId } = buildProviderClubIdIndex(ownTeams, rankingEntries);
  return { indexByTeamId };
}

/**
 * Builds a tenant's duplicate-group inventory from an ALREADY-RESOLVED
 * `providerTeamId -> providerClubId` index (read-only DB query + pure
 * grouping — no SFV/network call of its own). `loadTenantInventory()` below
 * is simply `resolveProviderClubIdIndex()` followed by this function; it is
 * exposed separately so a caller can reuse one already-fetched index for
 * both "build the inventory/plan" and "execute the mutation" without a
 * second SFV fetch in between (see `resolveProviderClubIdIndex` doc above).
 */
export async function loadTenantInventoryFromIndex(
  prisma: PrismaClient,
  tenant: TenantSfvContext,
  indexByTeamId: ReadonlyMap<number, number>,
): Promise<TenantInventory> {
  const mappingRows = await prisma.externalTeamProviderMapping.findMany({
    where: {
      tenantId: tenant.tenantId,
      provider: PROVIDER,
      providerTeamId: { in: [...indexByTeamId.keys()] },
    },
    select: { providerTeamId: true, externalTeam: { select: { externalClubId: true } } },
  });

  const rows: RawTeamMappingRow[] = mappingRows.map((m) => ({
    providerTeamId: m.providerTeamId,
    externalClubId: m.externalTeam.externalClubId,
  }));

  return {
    tenant,
    resolvedTeamCount: indexByTeamId.size,
    duplicateGroups: findDuplicateGroups(rows, indexByTeamId),
  };
}

export async function loadTenantInventory(
  prisma: PrismaClient,
  tenant: TenantSfvContext,
): Promise<TenantInventory> {
  const { indexByTeamId } = await resolveProviderClubIdIndex(tenant);
  return loadTenantInventoryFromIndex(prisma, tenant, indexByTeamId);
}

export async function buildTenantPlan(prisma: PrismaClient, inventory: TenantInventory): Promise<TenantPlan> {
  const groups: GroupPlan[] = [];

  for (const group of inventory.duplicateGroups) {
    const clubRows = await prisma.externalClub.findMany({
      where: { tenantId: inventory.tenant.tenantId, id: { in: group.distinctClubIds } },
      select: { id: true, logoUrl: true, createdAt: true, archivedAt: true },
    });

    const existingMapping = await prisma.externalClubProviderMapping.findFirst({
      where: { tenantId: inventory.tenant.tenantId, provider: PROVIDER, providerClubId: group.providerClubId },
      select: { externalClubId: true },
    });
    const preferredClubId =
      existingMapping !== null && group.distinctClubIds.includes(existingMapping.externalClubId)
        ? existingMapping.externalClubId
        : null;

    groups.push(buildGroupPlan(group, clubRows, preferredClubId));
  }

  return { tenant: inventory.tenant, groups };
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

/**
 * Captures the complete PRE-MUTATION state needed to understand/reconstruct
 * every ExternalClub / ExternalTeam / ExternalClubProviderMapping row that
 * consolidation may touch for the given (already-computed, read-only)
 * inventories.
 *
 * `clubProviderMappings` covers the gap consolidation's own
 * `ensureClubProviderMapping()` (lib/club-directory/consolidation-service.ts)
 * writes to but the original snapshot did not capture: consolidation
 * creates/re-points the ExternalClubProviderMapping for each affected
 * duplicate group's `providerClubId` to the chosen canonical club. Scoped to
 * this tenant + this provider + exactly the `providerClubId`s appearing in
 * `inv.duplicateGroups` (the same set the rest of this snapshot is built
 * from) — never any other tenant's mappings, and never a mapping for a
 * `providerClubId` outside the affected groups. A group with no pre-existing
 * mapping yields zero rows here, which correctly reflects that there was
 * nothing to restore for it.
 */
export async function buildBackupSnapshot(prisma: PrismaClient, inventories: TenantInventory[]) {
  const snapshot: Record<string, unknown> = { generatedAt: new Date().toISOString(), tenants: [] };
  const tenants: unknown[] = [];

  for (const inv of inventories) {
    if (inv.duplicateGroups.length === 0) continue;
    const clubIds = [...new Set(inv.duplicateGroups.flatMap((g) => g.distinctClubIds))];
    const providerClubIds = [...new Set(inv.duplicateGroups.map((g) => g.providerClubId))];
    const clubs = await prisma.externalClub.findMany({ where: { id: { in: clubIds } } });
    const teams = await prisma.externalTeam.findMany({ where: { externalClubId: { in: clubIds } } });
    const clubProviderMappings = await prisma.externalClubProviderMapping.findMany({
      where: { tenantId: inv.tenant.tenantId, provider: PROVIDER, providerClubId: { in: providerClubIds } },
    });
    tenants.push({
      tenantId: inv.tenant.tenantId,
      tenantKey: inv.tenant.tenantKey,
      clubs,
      teams,
      clubProviderMappings,
    });
  }

  snapshot.tenants = tenants;
  return snapshot;
}
