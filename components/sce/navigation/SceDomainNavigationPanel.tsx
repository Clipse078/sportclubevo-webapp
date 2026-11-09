"use client";

import Link from "next/link";
import type { MouseEvent, RefObject } from "react";
import { useLayoutEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { NavigationDomain } from "@/lib/nav/app-navigation-domains";
import type { DomainSecondaryNavItem } from "@/lib/nav/app-navigation-model";
import {
  resolveDomainNavigationPanelInitialL2Key,
  resolveDomainNavigationPanelUsesHierarchy,
  resolveDomainPanelRightColumnEntries,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import type { NavItemChild } from "@/lib/nav/nav-config";
import { cn } from "@/lib/cn";

export type SceDomainNavigationPanelProps = {
  panelId: string;
  open: boolean;
  headerRef: RefObject<HTMLElement | null>;
  domain: NavigationDomain;
  domainHeading: string;
  items: DomainSecondaryNavItem[];
  initialL2Key: string | null;
  resolveHref: (href: string) => string;
  isL2Active: (item: DomainSecondaryNavItem) => boolean;
  isL3Active: (child: NavItemChild) => boolean;
  onNavigateSibling: (event: MouseEvent<HTMLAnchorElement>, child: NavItemChild) => void;
  onClose: () => void;
};

/**
 * SCE-DS2-05B-R5 — integrated three-column domain navigation (density + scroll clamp).
 */
export function SceDomainNavigationPanel({
  panelId,
  open,
  headerRef,
  domain,
  domainHeading,
  items,
  initialL2Key,
  resolveHref,
  isL2Active,
  isL3Active,
  onNavigateSibling,
  onClose,
}: SceDomainNavigationPanelProps) {
  const hierarchical = resolveDomainNavigationPanelUsesHierarchy(domain, items);
  const autoL2Key = useMemo(
    () =>
      initialL2Key ??
      resolveDomainNavigationPanelInitialL2Key(domain, items, {
        activeDomainId: domain.id,
        activeDestinationKey: null,
        activeChildKey: null,
      }),
    [domain, initialL2Key, items],
  );
  const [userL2Key, setUserL2Key] = useState<string | null>(null);
  const selectedL2Key = userL2Key ?? autoL2Key;

  const selectedItem = useMemo(
    () => items.find((item) => item.key === selectedL2Key) ?? null,
    [items, selectedL2Key],
  );

  const rightColumnEntries = useMemo(() => {
    if (!hierarchical || !selectedItem) return [];
    return resolveDomainPanelRightColumnEntries(domain, selectedItem);
  }, [domain, hierarchical, selectedItem]);

  useLayoutEffect(() => {
    if (!open) return;

    const shell = headerRef.current?.closest(".sce-authenticated-app-shell");
    if (!(shell instanceof HTMLElement)) return;

    const syncPanelTop = () => {
      const header = headerRef.current;
      if (!header) return;
      const bottom = Math.ceil(header.getBoundingClientRect().bottom);
      shell.style.setProperty("--sce-domain-nav-panel-top", `${bottom}px`);
    };

    syncPanelTop();
    const header = headerRef.current;
    const resizeObserver =
      header && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncPanelTop)
        : null;
    if (header && resizeObserver) {
      resizeObserver.observe(header);
    }

    window.addEventListener("resize", syncPanelTop);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncPanelTop);
      shell.style.removeProperty("--sce-domain-nav-panel-top");
    };
  }, [headerRef, open, domain.id, items.length, rightColumnEntries.length, selectedL2Key]);

  if (!open || items.length === 0) {
    return null;
  }

  const showRightColumn = hierarchical && rightColumnEntries.length > 0;

  return (
    <div
      id={panelId}
      role="navigation"
      aria-label={domainHeading}
      data-testid="sce-domain-nav-panel"
      data-sce-domain-nav-panel-mode={hierarchical ? "hierarchical" : "simple"}
      className={cn(
        "sce-domain-nav-panel",
        "sce-domain-nav-panel--integrated",
        hierarchical && "sce-domain-nav-panel--hierarchical",
        showRightColumn && "sce-domain-nav-panel--three-column",
      )}
    >
      <div
        className={cn(
          "sce-domain-nav-panel-cham-body",
          !showRightColumn && "sce-domain-nav-panel-cham-body--two-column",
        )}
      >
        <h2 className="sce-domain-nav-panel-section-title" data-testid="sce-domain-nav-panel-title">
          {domainHeading}
        </h2>

        <div className="sce-domain-nav-panel-l2">
          <ul className="sce-domain-nav-panel-list">
            {items.map((item) => {
              const l3Children = resolveSecondaryNavItemModuleLocalChildren(domain, item);
              const hasL3 = l3Children.length > 0;
              const active = isL2Active(item);
              const selected = hierarchical && hasL3 && selectedL2Key === item.key;
              if (hierarchical && hasL3) {
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={cn(
                        "sce-domain-nav-panel-l2-control",
                        active && "sce-domain-nav-panel-l2-control--active",
                        selected && "sce-domain-nav-panel-l2-control--selected",
                      )}
                      data-nav-destination={item.key}
                      aria-expanded={selected}
                      onClick={() => setUserL2Key(item.key)}
                    >
                      <span className="sce-domain-nav-panel-l2-label">{item.label}</span>
                      <ChevronRight
                        className="sce-domain-nav-panel-l2-chevron h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <Link
                    href={resolveHref(item.href)}
                    className={cn(
                      "sce-domain-nav-panel-l2-link",
                      active && "sce-domain-nav-panel-l2-link--active",
                    )}
                    aria-current={active ? "page" : undefined}
                    data-nav-destination={item.key}
                    onClick={(event) => {
                      onNavigateSibling(event, {
                        key: item.key,
                        label: item.label,
                        href: item.href,
                      });
                      onClose();
                    }}
                  >
                    <span className="sce-domain-nav-panel-l2-label">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {showRightColumn && selectedItem ? (
          <div className="sce-domain-nav-panel-l3" aria-label={selectedItem.label}>
            <ul className="sce-domain-nav-panel-list">
              {rightColumnEntries.map((child) => {
                const active = isL3Active(child);
                return (
                  <li key={child.key}>
                    <Link
                      href={resolveHref(child.href)}
                      className={cn(
                        "sce-domain-nav-panel-l3-link",
                        active && "sce-domain-nav-panel-l3-link--active",
                      )}
                      aria-current={active ? "page" : undefined}
                      data-nav-context-destination={child.key}
                      onClick={(event) => {
                        onNavigateSibling(event, child);
                        onClose();
                      }}
                    >
                      {child.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
