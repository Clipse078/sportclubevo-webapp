/**
 * SCE-VISUAL-06 — permission-filtered application explorer (search + module pane).
 */

import type { NavItemChild } from "@/lib/nav/nav-config";
import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";
import type { AppNavigationModel } from "@/lib/nav/app-navigation-model";
import {
  isSingleHubNavigationDomain,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";

export type ExplorerModuleEntry = {
  key: string;
  label: string;
  href: string;
  carrySeason?: boolean;
  children: NavItemChild[];
};

export type ExplorerSearchHit = {
  key: string;
  label: string;
  href: string;
  domainId: AppNavigationDomainId;
  domainLabel: string;
  domainL1SceIconKey?: string;
  /** Module title when the hit is a child destination. */
  moduleLabel?: string;
  /** Nav-config module key for SCE icon resolution (module + child hits). */
  moduleNavKey?: string;
  kind: "domain" | "module" | "child";
};

/** Nav item key used to resolve approved SCE module icons in explorer search. */
export function resolveExplorerSearchHitNavKey(hit: ExplorerSearchHit): string | null {
  if (hit.kind === "domain") {
    return hit.domainL1SceIconKey ?? (hit.domainId === "dashboard" ? "dashboard" : null);
  }
  return hit.moduleNavKey ?? (hit.kind === "module" ? hit.key : null);
}

export function resolveExplorerModulesForDomain(domain: NavigationDomain): ExplorerModuleEntry[] {
  const secondary = resolveDomainSecondaryNavItems(domain);
  if (isSingleHubNavigationDomain(domain)) {
    return secondary.map((item) => ({
      key: item.key,
      label: item.label,
      href: item.href,
      carrySeason: item.carrySeason,
      children: [],
    }));
  }

  return secondary.map((item) => {
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

    for (const moduleEntry of resolveExplorerModulesForDomain(domain)) {
      hits.push({
        key: moduleEntry.key,
        label: moduleEntry.label,
        href: moduleEntry.href,
        domainId: domain.id,
        domainLabel: label,
        moduleNavKey: moduleEntry.key,
        kind: "module",
      });

      for (const child of moduleEntry.children) {
        hits.push({
          key: child.key,
          label: child.label,
          href: child.href,
          domainId: domain.id,
          domainLabel: label,
          moduleLabel: moduleEntry.label,
          moduleNavKey: moduleEntry.key,
          kind: "child",
        });
      }
    }
  }

  return hits;
}

export function filterExplorerSearchIndex(
  hits: readonly ExplorerSearchHit[],
  query: string,
): ExplorerSearchHit[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];

  return hits.filter((hit) => {
    const haystack = [hit.label, hit.domainLabel, hit.moduleLabel]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(normalized);
  });
}
