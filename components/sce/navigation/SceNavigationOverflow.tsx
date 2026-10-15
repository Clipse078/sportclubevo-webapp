"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";

type SceNavigationOverflowProps = {
  overflowDomains: NavigationDomain[];
  activeDomainId: AppNavigationDomainId | null;
  openDomainPanelId: AppNavigationDomainId | null;
  routeActiveDisabled: boolean;
  isDomainActive: (domain: NavigationDomain) => boolean;
  overflowOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  resolveHref: (href: string) => string;
  domainLabel: (domain: NavigationDomain) => string;
  moreLabel: string;
  domainHasNavigationPanel?: (domain: NavigationDomain) => boolean;
  onDomainPanelOpen?: (domain: NavigationDomain, trigger: HTMLButtonElement | null) => void;
};

export function SceNavigationOverflow({
  overflowDomains,
  activeDomainId,
  openDomainPanelId,
  routeActiveDisabled,
  isDomainActive,
  overflowOpen,
  onToggle,
  onNavigate,
  resolveHref,
  domainLabel,
  moreLabel,
  domainHasNavigationPanel,
  onDomainPanelOpen,
}: SceNavigationOverflowProps) {
  if (overflowDomains.length === 0) return null;

  const overflowRouteActive = overflowDomains.some((d) => isDomainActive(d));
  const overflowStrong =
    overflowOpen || (overflowRouteActive && openDomainPanelId == null);

  return (
    <div className="relative sce-global-primary-nav-overflow shrink-0">
      <button
        type="button"
        className={cn(
          "sce-global-primary-nav-item",
          overflowStrong && "sce-global-primary-nav-item--active",
        )}
        aria-expanded={overflowOpen}
        aria-haspopup="menu"
        data-testid="primary-nav-overflow-trigger"
        onClick={onToggle}
      >
        {moreLabel}
        <MoreHorizontal className="ml-1 h-4 w-4 opacity-70" aria-hidden="true" />
      </button>
      {overflowOpen ? (
        <div
          role="menu"
          className="sce-global-nav-overflow-panel absolute right-0 top-[calc(100%+4px)] z-50 min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--sce-app-chrome)] py-1 shadow-lg"
          data-testid="primary-nav-overflow-panel"
        >
          {overflowDomains.map((domain) => {
            const hasPanel = domainHasNavigationPanel?.(domain) ?? false;
            if (hasPanel && onDomainPanelOpen) {
              return (
                <button
                  key={domain.id}
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  onClick={(event) => {
                    onNavigate();
                    onDomainPanelOpen(domain, event.currentTarget);
                  }}
                >
                  {domainLabel(domain)}
                </button>
              );
            }

            return (
              <Link
                key={domain.id}
                role="menuitem"
                href={resolveHref(domain.defaultDestination.href)}
                className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                onClick={onNavigate}
              >
                {domainLabel(domain)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
