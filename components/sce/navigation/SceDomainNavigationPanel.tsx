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
import { NavDestinationSceIcon } from "@/components/nav/NavDestinationSceIcon";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
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

type PanelGeometry = {
  top: number;
  left: number;
  width: number;
};

function computePanelGeometry(
  header: HTMLElement,
  hierarchical: boolean,
): PanelGeometry {
  const viewportPadding = 12;
  const maxWidth = hierarchical ? 760 : 360;
  const minWidth = hierarchical ? 600 : 280;
  const width = Math.min(
    maxWidth,
    Math.max(minWidth, window.innerWidth - viewportPadding * 2),
  );

  const primaryRow = header.querySelector('[data-sce-nav-spine-row="primary"]');
  const workspace =
    primaryRow?.querySelector("[data-sce-nav-workspace]") ??
    header.querySelector("[data-sce-nav-workspace]");
  const anchorRect =
    workspace?.getBoundingClientRect() ??
    primaryRow?.getBoundingClientRect() ??
    header.getBoundingClientRect();
  const top =
    (primaryRow?.getBoundingClientRect() ?? header.getBoundingClientRect()).bottom + 4;

  let left = anchorRect.left;
  if (left + width > window.innerWidth - viewportPadding) {
    left = Math.max(viewportPadding, window.innerWidth - viewportPadding - width);
  }
  left = Math.max(viewportPadding, left);

  return { top, left, width };
}

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
  const [selectedL2Key, setSelectedL2Key] = useState<string | null>(initialL2Key);
  const [geometry, setGeometry] = useState<PanelGeometry | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setGeometry(null);
      return;
    }
    setSelectedL2Key(
      initialL2Key ??
        resolveDomainNavigationPanelInitialL2Key(domain, items, {
          activeDomainId: domain.id,
          activeDestinationKey: null,
          activeChildKey: null,
        }),
    );
  }, [open, initialL2Key, domain, items]);

  useLayoutEffect(() => {
    if (!open) return;
    const header = headerRef.current;
    if (!header) return;

    const update = () => {
      setGeometry(computePanelGeometry(header, hierarchical));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, headerRef, hierarchical, items.length, selectedL2Key]);

  const selectedItem = useMemo(
    () => items.find((item) => item.key === selectedL2Key) ?? null,
    [items, selectedL2Key],
  );

  const rightColumnEntries = useMemo(() => {
    if (!hierarchical || !selectedItem) return [];
    return resolveDomainPanelRightColumnEntries(domain, selectedItem);
  }, [domain, hierarchical, selectedItem]);

  if (!open || items.length === 0 || !geometry) {
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
        hierarchical && "sce-domain-nav-panel--hierarchical",
        showRightColumn && "sce-domain-nav-panel--two-column",
      )}
      style={{
        top: geometry.top,
        left: geometry.left,
        width: geometry.width,
      }}
    >
      <p className="sce-domain-nav-panel-domain-heading">{domainHeading}</p>
      <div className="sce-domain-nav-panel-body">
        <div className="sce-domain-nav-panel-l2">
          <ul className="sce-domain-nav-panel-list">
            {items.map((item) => {
              const l3Children = resolveSecondaryNavItemModuleLocalChildren(domain, item);
              const hasL3 = l3Children.length > 0;
              const active = isL2Active(item);
              const selected = hierarchical && hasL3 && selectedL2Key === item.key;
              const sceIcon = getNavDestinationSceIconName(item.key);

              if (hierarchical && hasL3) {
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={cn(
                        "sce-domain-nav-panel-l2-control",
                        (active || selected) && "sce-domain-nav-panel-l2-control--active",
                        selected && "sce-domain-nav-panel-l2-control--selected",
                      )}
                      aria-current={active ? "true" : undefined}
                      data-nav-destination={item.key}
                      onClick={() => setSelectedL2Key(item.key)}
                    >
                      <span className="sce-domain-nav-panel-l2-label">
                        {sceIcon ? (
                          <NavDestinationSceIcon navItemKey={item.key} size={16} active={active || selected} />
                        ) : null}
                        {item.label}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
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
                    <span className="sce-domain-nav-panel-l2-label">
                      {sceIcon ? (
                        <NavDestinationSceIcon navItemKey={item.key} size={16} active={active} />
                      ) : null}
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {showRightColumn && selectedItem ? (
          <div className="sce-domain-nav-panel-l3" aria-label={selectedItem.label}>
            <p className="sce-domain-nav-panel-l3-heading">{selectedItem.label}</p>
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
