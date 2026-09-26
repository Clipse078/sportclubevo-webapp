/**
 * SCE-VISUAL-06 / SCE-NAV-IA-V2-04 — permission-filtered application explorer (search + module pane).
 */

import type { NavItemChild } from "@/lib/nav/nav-config";
import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";
import type { AppNavigationModel } from "@/lib/nav/app-navigation-model";
import {
  resolveDomainExplorerModuleItems,
  resolveExplorerDomainGroups,
  type ExplorerDomainModule,
} from "@/lib/nav/app-navigation-model";

export type ExplorerModuleEntry = {
  key: string;
  label: string;
  href: string;
  carrySeason?: boolean;
  children: NavItemChild[];
  groupId?: string;
  groupLabel?: string;
};

export type ExplorerSearchHit = {
  key: string;
  label: string;
  href: string;
  domainId: AppNavigationDomainId;
  domainLabel: string;
  domainL1SceIconKey?: string;
  /** Canonical L2 group label when applicable. */
  groupLabel?: string;
  /** Module title when the hit is a child destination. */
  moduleLabel?: string;
  /** Nav-config module key for SCE icon resolution (module + child hits). */
  moduleNavKey?: string;
  kind: "domain" | "module" | "child";
};

const EXPLORER_SEARCH_KIND_RANK: Record<ExplorerSearchHit["kind"], number> = {
  module: 3,
  child: 2,
  domain: 1,
};

/** Nav item key used to resolve approved SCE module icons in explorer search. */
export function resolveExplorerSearchHitNavKey(hit: ExplorerSearchHit): string | null {
  if (hit.kind === "domain") {
    return hit.domainL1SceIconKey ?? (hit.domainId === "dashboard" ? "dashboard" : null);
  }
  return hit.moduleNavKey ?? (hit.kind === "module" ? hit.key : null);
}

function mapExplorerModule(module: ExplorerDomainModule): ExplorerModuleEntry {
  return {
    key: module.key,
    label: module.label,
    href: module.href,
    carrySeason: module.carrySeason,
    children: module.children,
    groupId: module.explorerGroupId,
    groupLabel: module.explorerGroupLabel,
  };
}

export function resolveExplorerModulesForDomain(domain: NavigationDomain): ExplorerModuleEntry[] {
  const grouped = resolveExplorerDomainGroups(domain);
  if (grouped) {
    return grouped.flatMap((group) => group.modules.map(mapExplorerModule));
  }

  return resolveDomainExplorerModuleItems(domain).map((item) => {
    const destination = domain.destinations.find((dest) => dest.key === item.key);
    return {
      key: item.key,
      label: item.label,
      href: item.href,
      carrySeason: item.carrySeason,
      children: destination?.children ?? [],
    };
  });
}

export function resolveExplorerGroupsForDomain(
  domain: NavigationDomain,
): Array<{ id: string; label: string; modules: ExplorerModuleEntry[] }> | null {
  const grouped = resolveExplorerDomainGroups(domain);
  if (!grouped) return null;
  return grouped.map((group) => ({
    id: group.id,
    label: group.label,
    modules: group.modules.map(mapExplorerModule),
  }));
}

function appendModuleSearchHits(
  hits: ExplorerSearchHit[],
  domain: NavigationDomain,
  domainLabel: string,
  moduleEntry: ExplorerModuleEntry,
): void {
  hits.push({
    key: moduleEntry.key,
    label: moduleEntry.label,
    href: moduleEntry.href,
    domainId: domain.id,
    domainLabel,
    groupLabel: moduleEntry.groupLabel,
    moduleNavKey: moduleEntry.key,
    kind: "module",
  });

  for (const child of moduleEntry.children) {
    hits.push({
      key: child.key,
      label: child.label,
      href: child.href,
      domainId: domain.id,
      domainLabel,
      groupLabel: moduleEntry.groupLabel,
      moduleLabel: moduleEntry.label,
      moduleNavKey: moduleEntry.key,
      kind: "child",
    });
  }
}

export function buildExplorerSearchIndex(
  model: AppNavigationModel,
  domainLabel: (domain: NavigationDomain) => string,
): ExplorerSearchHit[] {
  const hits: ExplorerSearchHit[] = [];

  for (const domain of model.domains) {
    const label = domainLabel(domain);
    hits.push({
      key: `domain:${domain.id}`,
      label,
      href: domain.defaultDestination.href,
      domainId: domain.id,
      domainLabel: label,
      domainL1SceIconKey: domain.l1SceIconKey,
      kind: "domain",
    });

    const groups = resolveExplorerGroupsForDomain(domain);
    if (groups) {
      for (const group of groups) {
        for (const moduleEntry of group.modules) {
          appendModuleSearchHits(hits, domain, label, moduleEntry);
        }
      }
      continue;
    }

    for (const moduleEntry of resolveExplorerModulesForDomain(domain)) {
      appendModuleSearchHits(hits, domain, label, moduleEntry);
    }
  }

  return hits;
}

/** Prefer one navigable hit per href (module beats child; canonical alias dedupe). */
export function dedupeExplorerSearchHits(
  hits: readonly ExplorerSearchHit[],
): ExplorerSearchHit[] {
  const bestByHref = new Map<string, ExplorerSearchHit>();

  for (const hit of hits) {
    if (hit.kind === "domain") continue;
    const existing = bestByHref.get(hit.href);
    if (!existing) {
      bestByHref.set(hit.href, hit);
      continue;
    }
    if (EXPLORER_SEARCH_KIND_RANK[hit.kind] > EXPLORER_SEARCH_KIND_RANK[existing.kind]) {
      bestByHref.set(hit.href, hit);
    }
  }

  const dedupedHrefKeys = new Set(bestByHref.values());
  return hits.filter((hit) => hit.kind === "domain" || dedupedHrefKeys.has(hit));
}

export function filterExplorerSearchIndex(
  hits: readonly ExplorerSearchHit[],
  query: string,
): ExplorerSearchHit[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];

  const filtered = hits.filter((hit) => {
    const haystack = [hit.label, hit.domainLabel, hit.groupLabel, hit.moduleLabel]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(normalized);
  });

  return dedupeExplorerSearchHits(filtered);
}

export function countDuplicateCanonicalExplorerSearchHits(
  hits: readonly ExplorerSearchHit[],
): number {
  const canonicalHits = hits.filter((hit) => hit.kind !== "domain");
  const deduped = dedupeExplorerSearchHits(canonicalHits);
  return canonicalHits.length - deduped.length;
}

export function formatExplorerSearchHitContext(hit: ExplorerSearchHit): string {
  if (hit.moduleLabel) {
    return `${hit.domainLabel} · ${hit.moduleLabel}`;
  }
  if (hit.groupLabel) {
    return `${hit.domainLabel} · ${hit.groupLabel}`;
  }
  return hit.domainLabel;
}
