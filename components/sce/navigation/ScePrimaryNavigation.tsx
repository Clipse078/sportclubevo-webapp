"use client";

import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";
import { SceIcon } from "@/components/design-system/icons/SceIcon";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { SceNavigationItem } from "@/components/sce/navigation/SceNavigationItem";
import { SceNavigationOverflow } from "@/components/sce/navigation/SceNavigationOverflow";
import { cn } from "@/lib/cn";

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
  openDomainPanelId: AppNavigationDomainId | null;
  onDomainPanelToggle: (domain: NavigationDomain, trigger: HTMLButtonElement | null) => void;
  domainHasNavigationPanel: (domain: NavigationDomain) => boolean;
  registerDomainPanelTrigger: (
    domainId: AppNavigationDomainId,
    node: HTMLButtonElement | null,
  ) => void;
  domainPanelControlsId: (domainId: AppNavigationDomainId) => string;
};

function PrimaryDomainTrigger({
  domain,
  label,
  isActive,
  isOpen,
  controlsId,
  onToggle,
  registerTrigger,
}: {
  domain: NavigationDomain;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  controlsId: string;
  onToggle: (trigger: HTMLButtonElement | null) => void;
  registerTrigger: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={registerTrigger}
      type="button"
      className={cn(
        "sce-global-primary-nav-item sce-global-primary-nav-domain shrink-0 inline-flex items-center",
        (isActive || isOpen) && "sce-global-primary-nav-item--active",
      )}
      aria-expanded={isOpen}
      aria-controls={controlsId}
      aria-haspopup="menu"
      data-nav-domain={domain.id}
      data-testid={`primary-domain-panel-trigger-${domain.id}`}
      onClick={(event) => onToggle(event.currentTarget)}
    >
      <span className="sce-global-primary-nav-domain-icon" aria-hidden>
        <SceIcon name={domain.l1SceIconKey as SceIconRegistryName} size={20} />
      </span>
      <span className="sce-global-primary-nav-domain-label">{label}</span>
    </button>
  );
}

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
  openDomainPanelId,
  onDomainPanelToggle,
  domainHasNavigationPanel,
  registerDomainPanelTrigger,
  domainPanelControlsId,
}: ScePrimaryNavigationProps) {
  return (
    <nav aria-label={ariaLabel} className={className} data-testid="sce-primary-navigation">
      <div className="sce-global-primary-nav-track flex min-w-0 items-center gap-0.5">
        {inlineDomains.map((domain) => {
          const hasPanel = domainHasNavigationPanel(domain);
          const isActive = isDomainActive(domain);
          const isOpen = openDomainPanelId === domain.id;
          const label = domainLabel(domain);

          if (hasPanel) {
            return (
              <PrimaryDomainTrigger
                key={domain.id}
                domain={domain}
                label={label}
                isActive={isActive}
                isOpen={isOpen}
                controlsId={domainPanelControlsId(domain.id)}
                onToggle={(trigger) => onDomainPanelToggle(domain, trigger)}
                registerTrigger={(node) => registerDomainPanelTrigger(domain.id, node)}
              />
            );
          }

          const dest =
            activeDomainId === domain.id && activeDestination
              ? activeDestination
              : domain.defaultDestination;
          const href = resolveHref(dest.href);

          return (
            <SceNavigationItem
              key={domain.id}
              level="primary"
              href={href}
              label={label}
              isActive={isActive}
              data-nav-domain={domain.id}
              icon={
                <span className="sce-global-primary-nav-domain-icon">
                  <SceIcon name={domain.l1SceIconKey as SceIconRegistryName} size={20} />
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
          domainHasNavigationPanel={domainHasNavigationPanel}
          onDomainPanelOpen={(domain, trigger) => onDomainPanelToggle(domain, trigger)}
        />
      </div>
    </nav>
  );
}
