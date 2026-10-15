"use client";

import type { MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { NavigationDomain } from "@/lib/nav/app-navigation-domains";
import type { DomainSecondaryNavItem } from "@/lib/nav/app-navigation-model";
import { resolveSecondaryNavItemModuleLocalChildren } from "@/lib/nav/app-navigation-model";
import type { NavItemChild } from "@/lib/nav/nav-config";
import { NavDestinationSceIcon } from "@/components/nav/NavDestinationSceIcon";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import { SceContextNavigationPanel } from "@/components/sce/navigation/SceContextNavigationPanel";
import { SceNavigationItem } from "@/components/sce/navigation/SceNavigationItem";
import { SceNavigationSpineRow } from "@/components/sce/navigation/SceNavigationSpineRow";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";

type SceModuleNavigationProps = {
  ariaLabel: string;
  domain: NavigationDomain;
  items: DomainSecondaryNavItem[];
  resolveHref: (href: string) => string;
  isItemActive: (item: DomainSecondaryNavItem) => boolean;
  isContextChildActive: (child: NavItemChild) => boolean;
  onNavigateSibling: (event: MouseEvent<HTMLAnchorElement>, child: NavItemChild) => void;
  brand?: ReactNode;
};

type ModuleNavEntryProps = {
  item: DomainSecondaryNavItem;
  domain: NavigationDomain;
  resolveHref: (href: string) => string;
  isItemActive: (item: DomainSecondaryNavItem) => boolean;
  isContextChildActive: (child: NavItemChild) => boolean;
  onNavigateSibling: (event: MouseEvent<HTMLAnchorElement>, child: NavItemChild) => void;
  openL3Key: string | null;
  onToggleL3: (itemKey: string) => void;
  onCloseL3: () => void;
};

function ModuleNavEntry({
  item,
  domain,
  resolveHref,
  isItemActive,
  isContextChildActive,
  onNavigateSibling,
  openL3Key,
  onToggleL3,
  onCloseL3,
}: ModuleNavEntryProps) {
  const panelId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const disclosureRef = useRef<HTMLButtonElement>(null);
  const l3Items = resolveSecondaryNavItemModuleLocalChildren(domain, item);
  const hasL3 = l3Items.length > 0;
  const isActive = isItemActive(item);
  const isOpen = openL3Key === item.key;
  const sceIcon = getNavDestinationSceIconName(item.key);

  return (
    <div
      ref={anchorRef}
      className={cn(
        "sce-global-module-nav-entry shrink-0",
        hasL3 && "sce-global-module-nav-entry--parent",
        isOpen && "sce-global-module-nav-entry--open",
      )}
      data-nav-destination-parent={hasL3 ? item.key : undefined}
    >
      <div className="sce-global-module-nav-entry-inner inline-flex items-center">
        <SceNavigationItem
          level="module"
          href={resolveHref(item.href)}
          label={item.label}
          isActive={isActive}
          data-nav-destination={item.key}
          icon={
            sceIcon ? (
              <NavDestinationSceIcon navItemKey={item.key} size={16} active={isActive} />
            ) : undefined
          }
        />
        {hasL3 ? (
          <button
            ref={disclosureRef}
            type="button"
            className="sce-global-module-nav-disclosure"
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={`${item.label}: Unterbereiche anzeigen`}
            data-testid={`module-l3-disclosure-${item.key}`}
            onClick={() => onToggleL3(item.key)}
          >
            <ChevronDown className={cn("h-3.5 w-3.5", isOpen && "rotate-180")} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {hasL3 ? (
        <SceContextNavigationPanel
          panelId={panelId}
          open={isOpen}
          anchorRef={anchorRef}
          title={item.label}
          items={l3Items}
          resolveHref={resolveHref}
          isItemActive={isContextChildActive}
          onNavigateSibling={onNavigateSibling}
          onClose={() => {
            onCloseL3();
            disclosureRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

export function SceModuleNavigation({
  ariaLabel,
  domain,
  items,
  resolveHref,
  isItemActive,
  isContextChildActive,
  onNavigateSibling,
  brand,
}: SceModuleNavigationProps) {
  const [openL3Key, setOpenL3Key] = useState<string | null>(null);

  const closeL3 = useCallback(() => setOpenL3Key(null), []);

  const toggleL3 = useCallback((itemKey: string) => {
    setOpenL3Key((current) => (current === itemKey ? null : itemKey));
  }, []);

  useEffect(() => {
    closeL3();
  }, [domain.id, items.length, closeL3]);

  useEffect(() => {
    if (!openL3Key) return;

    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      const openEntry = document.querySelector(
        `[data-nav-destination-parent="${openL3Key}"]`,
      );
      if (openEntry?.contains(target)) return;
      const panel = document.querySelector('[data-testid="sce-context-nav-panel"]');
      if (panel?.contains(target)) return;
      closeL3();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const disclosure = document.querySelector<HTMLButtonElement>(
        `[data-testid="module-l3-disclosure-${openL3Key}"]`,
      );
      closeL3();
      disclosure?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openL3Key, closeL3]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className="sce-global-module-nav hidden md:block"
      data-testid="domain-secondary-nav"
    >
      <SceNavigationSpineRow
        variant="module"
        brand={brand}
        workspace={
          <div className="sce-global-module-nav-track flex min-w-0 w-full gap-1 overflow-x-auto">
            {items.map((item) => (
              <ModuleNavEntry
                key={item.key}
                item={item}
                domain={domain}
                resolveHref={resolveHref}
                isItemActive={isItemActive}
                isContextChildActive={isContextChildActive}
                onNavigateSibling={onNavigateSibling}
                openL3Key={openL3Key}
                onToggleL3={toggleL3}
                onCloseL3={closeL3}
              />
            ))}
          </div>
        }
      />
    </nav>
  );
}
