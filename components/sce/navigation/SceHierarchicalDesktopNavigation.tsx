"use client";

import type { MouseEvent, ReactNode } from "react";
import { useMemo } from "react";
import type { NavigationDomain } from "@/lib/nav/app-navigation-domains";
import type { DomainSecondaryNavItem } from "@/lib/nav/app-navigation-model";
import {
  resolveDomainNavigationPanelInitialL2Key,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import type { ActiveAppNavigation } from "@/lib/nav/app-navigation-model";
import type { NavItemChild } from "@/lib/nav/nav-config";
import { SceNavigationItem } from "@/components/sce/navigation/SceNavigationItem";
import { SceNavigationSpineRow } from "@/components/sce/navigation/SceNavigationSpineRow";
import { SceTenantContextRow } from "@/components/sce/navigation/SceTenantContextRow";
export type SceHierarchicalDesktopNavigationProps = {
  moduleNavAria: string;
  contextNavAria: string;
  domain: NavigationDomain;
  domainHeading: string;
  items: DomainSecondaryNavItem[];
  active: ActiveAppNavigation;
  resolveHref: (href: string) => string;
  isL2Active: (item: DomainSecondaryNavItem) => boolean;
  isL3Active: (child: NavItemChild) => boolean;
  onNavigateSibling: (event: MouseEvent<HTMLAnchorElement>, child: NavItemChild) => void;
};

function SceDestinationContextRow({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="sce-global-context-nav hidden md:block"
      data-testid="domain-contextual-nav"
    >
      <SceNavigationSpineRow
        variant="context"
        workspace={
          <div className="sce-global-context-nav-track flex min-w-0 w-full items-center gap-0.5 overflow-x-auto">
            {children}
          </div>
        }
      />
    </nav>
  );
}

/**
 * SCE-DS2-05B-R3 — persistent desktop L2 (section) + L3 (destination) navigation.
 * Mega-menu panel remains the L1 discovery fallback in AppShellNavigation.
 */
export function SceHierarchicalDesktopNavigation({
  moduleNavAria,
  contextNavAria,
  domain,
  domainHeading,
  items,
  active,
  resolveHref,
  isL2Active,
  isL3Active,
  onNavigateSibling,
}: SceHierarchicalDesktopNavigationProps) {
  const activeL2Key = useMemo(
    () => resolveDomainNavigationPanelInitialL2Key(domain, items, active),
    [active, domain, items],
  );

  const activeL2 = useMemo(
    () => items.find((item) => item.key === activeL2Key) ?? null,
    [activeL2Key, items],
  );

  const l3Items = useMemo(() => {
    if (!activeL2) return [];
    return resolveSecondaryNavItemModuleLocalChildren(domain, activeL2);
  }, [activeL2, domain]);

  if (items.length === 0) return null;

  const l2Track = (
    <div className="sce-global-module-nav-track flex min-w-0 w-full items-center gap-1 overflow-x-auto">
      <p
        className="sce-global-domain-section-heading sce-header-nav-label m-0 shrink-0 pr-2"
        data-testid="sce-domain-section-heading"
      >
        {domainHeading}
      </p>
      <span className="sce-global-nav-level-separator shrink-0" aria-hidden />
      {items.map((item) => (
        <SceNavigationItem
          key={item.key}
          level="module"
          href={resolveHref(item.href)}
          label={item.label}
          isActive={isL2Active(item)}
          data-nav-destination={item.key}
          data-testid={`sce-module-nav-${item.key}`}
          className="sce-global-module-nav-item--r3 shrink-0"
        />
      ))}
    </div>
  );

  return (
    <>
      <SceTenantContextRow ariaLabel={moduleNavAria} brand={null} workspace={l2Track} />
      {l3Items.length > 0 ? (
        <SceDestinationContextRow ariaLabel={contextNavAria}>
          {l3Items.map((child) => (
            <SceNavigationItem
              key={child.key}
              level="context"
              href={resolveHref(child.href)}
              label={child.label}
              isActive={isL3Active(child)}
              data-nav-destination={child.key}
              data-testid={`sce-context-nav-${child.key}`}
              onClick={(event) => onNavigateSibling(event, child)}
              className="shrink-0"
            />
          ))}
        </SceDestinationContextRow>
      ) : null}
    </>
  );
}
