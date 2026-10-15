"use client";

import type { DomainSecondaryNavItem } from "@/lib/nav/app-navigation-model";
import { NavDestinationSceIcon } from "@/components/nav/NavDestinationSceIcon";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import { SceNavigationItem } from "@/components/sce/navigation/SceNavigationItem";

type SceModuleNavigationProps = {
  ariaLabel: string;
  items: DomainSecondaryNavItem[];
  resolveHref: (href: string) => string;
  isItemActive: (item: DomainSecondaryNavItem) => boolean;
};

export function SceModuleNavigation({
  ariaLabel,
  items,
  resolveHref,
  isItemActive,
}: SceModuleNavigationProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className="sce-global-module-nav hidden md:block"
      data-testid="domain-secondary-nav"
    >
      <div className="sce-global-module-nav-track flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const isActive = isItemActive(item);
          const sceIcon = getNavDestinationSceIconName(item.key);
          return (
            <SceNavigationItem
              key={item.key}
              level="module"
              href={resolveHref(item.href)}
              label={item.label}
              isActive={isActive}
              data-nav-destination={item.key}
              icon={
                sceIcon ? (
                  <NavDestinationSceIcon navItemKey={item.key} size={20} active={isActive} />
                ) : undefined
              }
            />
          );
        })}
      </div>
    </nav>
  );
}
