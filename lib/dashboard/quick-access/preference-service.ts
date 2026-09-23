import { prisma } from "@/lib/db/prisma";
import { catalogEntryMap, buildQuickAccessCatalog } from "./build-catalog";
import { deriveDefaultQuickAccessKeys } from "./defaults";
import type {
  DashboardQuickAccessItemDto,
  QuickAccessCatalogContext,
  QuickAccessCatalogEntry,
} from "./types";
import {
  filterStoredKeysToAuthorized,
  validatePinnedKeysInput,
  type QuickAccessValidationResult,
} from "./validation";
import { QUICK_ACCESS_MAX_PINS } from "./constants";
import type { PersonalContext } from "@/lib/dashboard/personal-context/types";

export async function loadStoredQuickAccessPinnedKeys(
  tenantId: string,
  userId: string,
): Promise<{ pinnedKeys: string[]; hasStoredPreference: boolean }> {
  const row = await prisma.userDashboardQuickAccessPreference.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { pinnedKeys: true },
  });
  if (!row) {
    return { pinnedKeys: [], hasStoredPreference: false };
  }
  return { pinnedKeys: row.pinnedKeys, hasStoredPreference: true };
}

export function resolveVisibleQuickAccessKeys(input: {
  catalog: QuickAccessCatalogEntry[];
  storedPinnedKeys: string[];
  hasStoredPreference: boolean;
  personalContext: PersonalContext | null;
}): string[] {
  const authorized = new Set(input.catalog.map((entry) => entry.key));

  if (!input.hasStoredPreference) {
    return deriveDefaultQuickAccessKeys(input.catalog, input.personalContext);
  }

  const filtered = filterStoredKeysToAuthorized(input.storedPinnedKeys, authorized);
  if (filtered.length === 0) {
    return deriveDefaultQuickAccessKeys(input.catalog, input.personalContext);
  }
  return filtered.slice(0, QUICK_ACCESS_MAX_PINS);
}

export function mapQuickAccessToDto(
  entries: QuickAccessCatalogEntry[],
  labelResolver: (entry: QuickAccessCatalogEntry) => string,
): DashboardQuickAccessItemDto[] {
  return entries.map((entry) => ({
    key: entry.key,
    kind: entry.kind === "CREATE_ACTION" ? "create" : "navigate",
    label: labelResolver(entry),
    href: entry.href,
    iconLabel: entry.iconLabel,
  }));
}

export function resolveQuickAccessItemsFromKeys(
  orderedKeys: string[],
  catalogByKey: Map<string, QuickAccessCatalogEntry>,
  labelResolver: (entry: QuickAccessCatalogEntry) => string,
): DashboardQuickAccessItemDto[] {
  const items: DashboardQuickAccessItemDto[] = [];
  for (const key of orderedKeys) {
    const entry = catalogByKey.get(key);
    if (!entry) {
      continue;
    }
    items.push({
      key: entry.key,
      kind: entry.kind === "CREATE_ACTION" ? "create" : "navigate",
      label: labelResolver(entry),
      href: entry.href,
      iconLabel: entry.iconLabel,
    });
  }
  return items;
}

export async function saveQuickAccessPreference(
  tenantId: string,
  userId: string,
  pinnedKeys: string[],
  catalogContext: QuickAccessCatalogContext,
): Promise<QuickAccessValidationResult> {
  const catalog = buildQuickAccessCatalog(catalogContext);
  const allowed = new Set(catalog.map((entry) => entry.key));
  const validated = validatePinnedKeysInput(pinnedKeys, allowed);
  if (!validated.ok) {
    return validated;
  }

  await prisma.userDashboardQuickAccessPreference.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      pinnedKeys: validated.pinnedKeys,
    },
    update: {
      pinnedKeys: validated.pinnedKeys,
    },
  });

  return validated;
}

export async function resetQuickAccessPreference(
  tenantId: string,
  userId: string,
): Promise<void> {
  await prisma.userDashboardQuickAccessPreference.deleteMany({
    where: { tenantId, userId },
  });
}

export function buildCustomizerCatalog(
  catalogContext: QuickAccessCatalogContext,
): QuickAccessCatalogEntry[] {
  return buildQuickAccessCatalog(catalogContext);
}

export function getAuthorizedCatalogKeySet(
  catalogContext: QuickAccessCatalogContext,
): Set<string> {
  return new Set(buildQuickAccessCatalog(catalogContext).map((entry) => entry.key));
}

export function getCatalogByKey(
  catalogContext: QuickAccessCatalogContext,
): Map<string, QuickAccessCatalogEntry> {
  return catalogEntryMap(catalogContext);
}
