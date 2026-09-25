"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { Menu, MoreHorizontal } from "lucide-react";
import SidebarPlatformBrand from "@/components/admin/branding/SidebarPlatformBrand";
import AdminPageActions from "@/components/admin/layout/AdminPageActions";
import AccountMenu from "@/components/admin/layout/AccountMenu";
import HeaderTenantIdentity from "@/components/admin/layout/HeaderTenantIdentity";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import NotificationBell from "@/components/admin/notifications/NotificationBell";
import {
  buildAppNavigationModelForUser,
  buildNavigationHref,
  isNavigationChildActive,
  isNavigationHrefActive,
  resolveActiveAppNavigation,
  selectMobileBottomPrimaryItems,
  type AppNavigationPrimaryItem,
} from "@/lib/nav/app-navigation-model";
import type { NavCapabilityContext } from "@/lib/nav/nav-config";
import type { PermissionKey } from "@/lib/permissions/permissions";
import {
  SCE_GLOBAL_APP_HEADER_CLASS,
  SCE_MOBILE_BOTTOM_NAV_CLASS,
} from "@/lib/shell/sce-app-shell-nav";
import type { WorkspaceContext } from "@/lib/workspace/workspace-context";
import { cn } from "@/lib/cn";

type AppShellNavigationProps = {
  permissionKeys: string[];
  workspaceContext?: WorkspaceContext;
  clubName?: string;
  logoUrl?: string | null;
  navCapabilities?: NavCapabilityContext;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string | null;
};

function PrimaryNavLink({
  item,
  href,
  isActive,
  className,
}: {
  item: AppNavigationPrimaryItem;
  href: string;
  isActive: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      data-nav-priority={item.priority}
      data-nav-key={item.key}
      className={cn(
        "sce-global-primary-nav-item shrink-0",
        isActive && "sce-global-primary-nav-item--active",
        className,
      )}
    >
      {item.label}
    </Link>
  );
}

function AppShellNavigationInner({
  permissionKeys,
  workspaceContext = "club",
  clubName,
  logoUrl,
  navCapabilities,
  firstName,
  lastName,
  email,
  imageUrl,
}: AppShellNavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSeason = searchParams.get("season");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const isPlatformWorkspace = workspaceContext === "platform";
  const displayClubName = isPlatformWorkspace
    ? "SportClubEvo Platform"
    : (clubName ?? "SportClubEvo");

  const model = useMemo(
    () =>
      buildAppNavigationModelForUser(
        permissionKeys as PermissionKey[],
        workspaceContext,
        navCapabilities,
      ),
    [permissionKeys, workspaceContext, navCapabilities],
  );

  const active = useMemo(
    () => resolveActiveAppNavigation(pathname, model),
    [pathname, model],
  );

  const resolveHref = useCallback(
    (baseHref: string) => buildNavigationHref(baseHref, selectedSeason),
    [selectedSeason],
  );

  const mobileBottomItems = useMemo(
    () => selectMobileBottomPrimaryItems(model, active.activePrimaryKey, 3),
    [model, active.activePrimaryKey],
  );

  const overflowCandidates = model.primaryItems.filter((item) => item.priority >= 3);

  return (
    <>
      <header className={SCE_GLOBAL_APP_HEADER_CLASS}>
        <div className="sce-global-app-header-row sce-global-app-header-row--primary">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <div className="hidden sm:block sce-global-sce-brand sce-global-sce-brand--wordmark">
              <SidebarPlatformBrand collapsed={false} className="!py-0 !px-0" />
            </div>
            <div className="sm:hidden sce-global-sce-brand sce-global-sce-brand--compact">
              <SidebarPlatformBrand collapsed className="!py-0 !px-0" />
            </div>

            <span
              className="hidden md:block h-5 w-px bg-[color-mix(in_srgb,var(--border)_70%,transparent)]"
              aria-hidden="true"
            />

            <HeaderTenantIdentity
              tenantName={displayClubName}
              logoUrl={isPlatformWorkspace ? null : logoUrl}
              platformWorkspace={isPlatformWorkspace}
              compact={false}
              className="hidden min-[480px]:flex"
            />
            <HeaderTenantIdentity
              tenantName={displayClubName}
              logoUrl={isPlatformWorkspace ? null : logoUrl}
              platformWorkspace={isPlatformWorkspace}
              compact
              className="min-[480px]:hidden flex"
            />
          </div>

          <nav
            aria-label="Hauptnavigation"
            className="sce-global-primary-nav hidden md:flex min-w-0 flex-1 justify-center"
          >
            <div className="sce-global-primary-nav-track flex min-w-0 items-center gap-0.5">
              {model.primaryItems.map((item) => {
                const href = resolveHref(item.href);
                const isActive =
                  active.activePrimaryKey === item.key ||
                  isNavigationHrefActive(pathname, item.href) ||
                  (item.children?.some((c) => isNavigationChildActive(pathname, c)) ??
                    false);
                return (
                  <PrimaryNavLink
                    key={item.key}
                    item={item}
                    href={href}
                    isActive={isActive}
                  />
                );
              })}

              {overflowCandidates.length > 0 ? (
                <div className="relative sce-global-primary-nav-overflow xl:hidden">
                  <button
                    type="button"
                    className={cn(
                      "sce-global-primary-nav-item",
                      overflowOpen && "sce-global-primary-nav-item--active",
                    )}
                    aria-expanded={overflowOpen}
                    aria-haspopup="menu"
                    onClick={() => setOverflowOpen((v) => !v)}
                  >
                    Mehr
                    <MoreHorizontal className="ml-1 h-4 w-4 opacity-70" aria-hidden="true" />
                  </button>
                  {overflowOpen ? (
                    <div
                      role="menu"
                      className="sce-global-nav-overflow-panel absolute right-0 top-[calc(100%+4px)] z-50 min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--sce-app-chrome)] py-1 shadow-lg"
                    >
                      {overflowCandidates.map((item) => (
                        <Link
                          key={item.key}
                          role="menuitem"
                          href={resolveHref(item.href)}
                          className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                          onClick={() => setOverflowOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="sce-icon-button md:hidden min-h-[2.75rem] min-w-[2.75rem]"
              aria-label="Navigation öffnen"
              aria-expanded={mobileDrawerOpen}
              onClick={() => setMobileDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="hidden md:flex items-center gap-1">
              <Suspense fallback={null}>
                <AdminPageActions />
              </Suspense>
            </div>

            <NotificationBell />
            <AccountMenu
              firstName={firstName}
              lastName={lastName}
              email={email}
              imageUrl={imageUrl}
            />
          </div>
        </div>

        {active.contextualChildren.length > 0 ? (
          <nav
            aria-label="Kontextnavigation"
            className="sce-global-context-nav hidden md:block border-t border-[color-mix(in_srgb,var(--border)_55%,transparent)]"
          >
            <div className="sce-global-context-nav-track flex gap-1 overflow-x-auto px-4 py-1.5">
              {active.contextualChildren.map((child) => {
                const childHref = resolveHref(child.href);
                const isChildActive = isNavigationChildActive(pathname, child);
                return (
                  <Link
                    key={child.key}
                    href={childHref}
                    aria-current={isChildActive ? "page" : undefined}
                    className={cn(
                      "sce-global-context-nav-item shrink-0",
                      isChildActive && "sce-global-context-nav-item--active",
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </header>

      <nav
        aria-label="Mobile Hauptnavigation"
        className={cn(SCE_MOBILE_BOTTOM_NAV_CLASS, "md:hidden")}
      >
        {mobileBottomItems.map((item) => {
          const href = resolveHref(item.href);
          const isActive = active.activePrimaryKey === item.key;
          return (
            <Link
              key={item.key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "sce-mobile-bottom-nav-item",
                isActive && "sce-mobile-bottom-nav-item--active",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          className="sce-mobile-bottom-nav-item"
          aria-label="Weitere Navigation"
          onClick={() => setMobileDrawerOpen(true)}
        >
          Mehr
        </button>
      </nav>

      {mobileDrawerOpen ? (
        <div
          className="sce-mobile-nav-drawer-backdrop fixed inset-0 z-[60] bg-black/40 md:hidden"
          role="presentation"
          onClick={() => setMobileDrawerOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMobileDrawerOpen(false);
          }}
        >
          <div
            className="sce-mobile-nav-drawer absolute left-0 top-0 h-full w-[min(100%,320px)] shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminSidebar
              permissionKeys={permissionKeys}
              workspaceContext={workspaceContext}
              clubName={clubName}
              logoUrl={logoUrl}
              navCapabilities={navCapabilities}
              embedded
            />
            <button
              type="button"
              className="absolute right-3 top-3 sce-icon-button min-h-[2.75rem] min-w-[2.75rem] z-10"
              aria-label="Navigation schliessen"
              onClick={() => setMobileDrawerOpen(false)}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function AppShellNavigation(props: AppShellNavigationProps) {
  return (
    <Suspense fallback={null}>
      <AppShellNavigationInner {...props} />
    </Suspense>
  );
}
