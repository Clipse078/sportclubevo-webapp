"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavigationDomain } from "@/lib/nav/app-navigation-domains";

type SceNavigationOverflowProps = {
  overflowDomains: NavigationDomain[];
  activeDomainId: string | null;
  overflowOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  resolveHref: (href: string) => string;
  domainLabel: (domain: NavigationDomain) => string;
  moreLabel: string;
};

export function SceNavigationOverflow({
  overflowDomains,
  activeDomainId,
  overflowOpen,
  onToggle,
  onNavigate,
  resolveHref,
  domainLabel,
  moreLabel,
}: SceNavigationOverflowProps) {
  if (overflowDomains.length === 0) return null;

  const overflowActive = overflowDomains.some((d) => d.id === activeDomainId);

  return (
    <div className="relative sce-global-primary-nav-overflow shrink-0">
      <button
        type="button"
        className={cn(
          "sce-global-primary-nav-item",
          (overflowOpen || overflowActive) && "sce-global-primary-nav-item--active",
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
          {overflowDomains.map((domain) => (
            <Link
              key={domain.id}
              role="menuitem"
              href={resolveHref(domain.defaultDestination.href)}
              className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              onClick={onNavigate}
            >
              {domainLabel(domain)}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
