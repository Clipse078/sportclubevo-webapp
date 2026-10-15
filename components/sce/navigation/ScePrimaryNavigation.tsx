"use client";

import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";
import { SceIcon } from "@/components/design-system/icons/SceIcon";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { SceNavigationItem } from "@/components/sce/navigation/SceNavigationItem";
import { SceNavigationOverflow } from "@/components/sce/navigation/SceNavigationOverflow";

type ActiveDestination = { href: string } | null;

type ScePrimaryNavigationProps = {
  ariaLabel: string;
  inlineDomains: NavigationDomain[];
  overflowDomains: NavigationDomain[];
  activeDomainId: AppNavigationDomainId | null;
  activeDestination: ActiveDestination;
  overflowOpen: boolean;
  onOverflowToggle: () => void;
  onOverflowNavigate: () => void;
  resolveHref: (href: string) => string;
  domainLabel: (domain: NavigationDomain) => string;
  isDomainActive: (domain: NavigationDomain) => boolean;
  moreLabel: string;
  className?: string;
};

export function ScePrimaryNavigation({
  ariaLabel,
  inlineDomains,
  overflowDomains,
  activeDomainId,
  activeDestination,
  overflowOpen,
  onOverflowToggle,
  onOverflowNavigate,
  resolveHref,
  domainLabel,
  isDomainActive,
  moreLabel,
  className,
}: ScePrimaryNavigationProps) {
  return (
    <nav aria-label={ariaLabel} className={className} data-testid="sce-primary-navigation">
      <div className="sce-global-primary-nav-track flex min-w-0 items-center gap-0.5">
        {inlineDomains.map((domain) => {
          const dest =
            activeDomainId === domain.id && activeDestination
              ? activeDestination
              : domain.defaultDestination;
          const href = resolveHref(dest.href);
          const isActive = isDomainActive(domain);
          return (
            <SceNavigationItem
              key={domain.id}
              level="primary"
              href={href}
              label={domainLabel(domain)}
              isActive={isActive}
              data-nav-domain={domain.id}
              icon={
                <span className="sce-global-primary-nav-domain-icon">
                  <SceIcon name={domain.l1SceIconKey as SceIconRegistryName} size={18} />
                </span>
              }
            />
          );
        })}

        <SceNavigationOverflow
          overflowDomains={overflowDomains}
          activeDomainId={activeDomainId}
          overflowOpen={overflowOpen}
          onToggle={onOverflowToggle}
          onNavigate={onOverflowNavigate}
          resolveHref={resolveHref}
          domainLabel={domainLabel}
          moreLabel={moreLabel}
        />
      </div>
    </nav>
  );
}
