"use client";

import Link from "next/link";
import type { MouseEvent, RefObject } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import {
  computeDomainNavOverlayGeometry,
  domainNavOverlayStyle,
  resolveDomainNavOverlayAnchorBottom,
  resolveDomainNavOverlayTheme,
} from "@/lib/nav/sce-domain-nav-overlay-geometry";
import { SCE_FLOATING_LAYER_APP_CLASS } from "@/lib/ui/sce-overlay-layering";
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

function useStableDomainNavOverlay(
  open: boolean,
  headerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const applyGeometry = () => {
      const header = headerRef.current;
      const theme = resolveDomainNavOverlayTheme(header);
      if (theme) {
        panel.setAttribute("data-sce-theme", theme);
      } else {
        panel.removeAttribute("data-sce-theme");
      }
      const geometry = computeDomainNavOverlayGeometry(
        resolveDomainNavOverlayAnchorBottom(header),
        window.innerHeight,
      );
      const style = domainNavOverlayStyle(geometry);
      panel.style.top = style.top;
      panel.style.setProperty(
        "--sce-domain-nav-overlay-max-height",
        style["--sce-domain-nav-overlay-max-height"],
      );
    };

    applyGeometry();
    window.addEventListener("resize", applyGeometry);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", applyGeometry);
    return () => {
      window.removeEventListener("resize", applyGeometry);
      visualViewport?.removeEventListener("resize", applyGeometry);
    };
  }, [headerRef, open, panelRef]);
}

/**
 * SCE-DS2-05B-R7 — portalled Cham-style domain navigation overlay.
 * Anchored below the primary header row; out of document flow.
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
  const panelRef = useRef<HTMLDivElement>(null);
  useStableDomainNavOverlay(open, headerRef, panelRef);

  const selectedItem = useMemo(
    () => items.find((item) => item.key === selectedL2Key) ?? null,
    [items, selectedL2Key],
  );

  const rightColumnEntries = useMemo(() => {
    if (!hierarchical || !selectedItem) return [];
    return resolveDomainPanelRightColumnEntries(domain, selectedItem);
  }, [domain, hierarchical, selectedItem]);

  if (!open || items.length === 0 || typeof document === "undefined") {
    return null;
  }

  const showRightColumn = hierarchical && rightColumnEntries.length > 0;

  const panel = (
    <div
      ref={panelRef}
      id={panelId}
      role="navigation"
      aria-label={domainHeading}
      data-testid="sce-domain-nav-panel"
      data-sce-domain-nav-panel-mode={hierarchical ? "hierarchical" : "simple"}
      data-sce-domain-nav-overlay=""
      className={cn(
        "sce-domain-nav-panel",
        "sce-domain-nav-panel--integrated",
        "sce-domain-nav-panel--overlay",
        SCE_FLOATING_LAYER_APP_CLASS,
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

  return createPortal(panel, document.body);
}
