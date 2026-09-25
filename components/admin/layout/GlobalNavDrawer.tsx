"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { AppNavigationModel, ActiveAppNavigation } from "@/lib/nav/app-navigation-model";
import {
  isNavigationChildActive,
  isNavigationHrefActive,
  isSingleHubNavigationDomain,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";
import type { NavigationDomain } from "@/lib/nav/app-navigation-domains";
import { cn } from "@/lib/cn";

type GlobalNavDrawerProps = {
  panelId: string;
  open: boolean;
  onClose: () => void;
  model: AppNavigationModel;
  active: ActiveAppNavigation;
  pathname: string;
  resolveHref: (href: string) => string;
  domainLabel: (domain: NavigationDomain) => string;
  title: string;
  closeLabel: string;
};

export default function GlobalNavDrawer({
  panelId,
  open,
  onClose,
  model,
  active,
  pathname,
  resolveHref,
  domainLabel,
  title,
  closeLabel,
}: GlobalNavDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sce-global-nav-drawer-backdrop fixed inset-0 z-[80] bg-black/45"
      role="presentation"
      data-testid="global-nav-drawer-backdrop"
      onClick={onClose}
    >
      <div
        id={panelId}
        className="sce-global-nav-drawer absolute left-0 top-0 flex h-full w-[min(100%,360px)] flex-col border-r border-[var(--border)] bg-[var(--sce-app-chrome)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="global-nav-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            type="button"
            className="sce-icon-button min-h-[2.75rem] min-w-[2.75rem]"
            aria-label={closeLabel}
            data-testid="global-nav-drawer-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label={title}
          data-testid="global-nav-drawer-tree"
        >
          {model.domains.map((domain) => {
            const domainActive = active.activeDomainId === domain.id;
            const secondaryItems = resolveDomainSecondaryNavItems(domain);
            const hub = isSingleHubNavigationDomain(domain);

            return (
              <section key={domain.id} className="mb-5 last:mb-0" data-nav-domain={domain.id}>
                <p
                  className={cn(
                    "mb-1.5 px-2 text-xs font-bold uppercase tracking-wide text-[var(--text-2)]",
                    domainActive && "text-[var(--sce-primary)]",
                  )}
                >
                  {domainLabel(domain)}
                </p>

                <ul className="space-y-0.5">
                  {hub
                    ? secondaryItems.map((item) => {
                        const childActive = isNavigationChildActive(pathname, {
                          key: item.key,
                          label: item.label,
                          href: item.href,
                        });
                        return (
                          <li key={item.key}>
                            <Link
                              href={resolveHref(item.href)}
                              className={cn(
                                "block rounded-md px-2 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                                childActive && "bg-[color-mix(in_srgb,var(--sce-primary)_12%,transparent)] text-[var(--sce-primary)] font-semibold",
                              )}
                              aria-current={childActive ? "page" : undefined}
                              onClick={onClose}
                            >
                              {item.label}
                            </Link>
                          </li>
                        );
                      })
                    : domain.destinations.map((dest) => {
                        const destActive =
                          active.activeDestinationKey === dest.key ||
                          isNavigationHrefActive(pathname, dest.href) ||
                          (dest.children?.some((c) => isNavigationChildActive(pathname, c)) ?? false);

                        return (
                          <li key={dest.key}>
                            <Link
                              href={resolveHref(dest.href)}
                              className={cn(
                                "block rounded-md px-2 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                                destActive && "font-semibold text-[var(--sce-primary)]",
                              )}
                              aria-current={destActive && !dest.children?.length ? "page" : undefined}
                              onClick={onClose}
                            >
                              {dest.label}
                            </Link>
                            {dest.children && dest.children.length > 0 ? (
                              <ul className="mb-1 ml-3 border-l border-[var(--border)] pl-2">
                                {dest.children.map((child) => {
                                  const childActive = isNavigationChildActive(pathname, child);
                                  return (
                                    <li key={child.key}>
                                      <Link
                                        href={resolveHref(child.href)}
                                        className={cn(
                                          "block rounded-md px-2 py-1.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                                          childActive &&
                                            "font-medium text-[var(--sce-primary)] bg-[color-mix(in_srgb,var(--sce-primary)_10%,transparent)]",
                                        )}
                                        aria-current={childActive ? "page" : undefined}
                                        onClick={onClose}
                                      >
                                        {child.label}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </li>
                        );
                      })}
                </ul>
              </section>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
