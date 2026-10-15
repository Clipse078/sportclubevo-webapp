"use client";

import type { MouseEvent } from "react";
import type { NavItemChild } from "@/lib/nav/nav-config";
import { SceNavigationItem } from "@/components/sce/navigation/SceNavigationItem";

type SceContextNavigationProps = {
  ariaLabel: string;
  items: NavItemChild[];
  pathname: string;
  resolveHref: (href: string) => string;
  isItemActive: (child: NavItemChild) => boolean;
  onNavigateSibling: (event: MouseEvent<HTMLAnchorElement>, child: NavItemChild) => void;
};

export function SceContextNavigation({
  ariaLabel,
  items,
  resolveHref,
  isItemActive,
  onNavigateSibling,
}: SceContextNavigationProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className="sce-global-context-nav hidden md:block"
      data-testid="module-local-nav"
    >
      <div className="sce-global-context-nav-track flex gap-1 overflow-x-auto">
        {items.map((child) => (
          <SceNavigationItem
            key={child.key}
            level="context"
            href={resolveHref(child.href)}
            label={child.label}
            isActive={isItemActive(child)}
            onClick={(event) => onNavigateSibling(event, child)}
          />
        ))}
      </div>
    </nav>
  );
}
