"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, MoreHorizontal } from "lucide-react";
import SidebarPlatformBrand from "@/components/admin/branding/SidebarPlatformBrand";
import AdminPageActions from "@/components/admin/layout/AdminPageActions";
import AccountMenu from "@/components/admin/layout/AccountMenu";
import HeaderTenantIdentity from "@/components/admin/layout/HeaderTenantIdentity";
import GlobalNavDrawer from "@/components/admin/layout/GlobalNavDrawer";
import NotificationBell from "@/components/admin/notifications/NotificationBell";
import {
  buildAppNavigationModelForUser,
  buildNavigationHref,
  isDomainHeaderSecondaryItemActive,
  isNavigationChildActive,
  isNavigationHrefActive,
  resolveActiveAppNavigation,
  resolvePrimaryDomainPresentation,
  selectMobileBottomDomains,
  type DomainSecondaryNavItem,
} from "@/lib/nav/app-navigation-model";
import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";
import type { NavCapabilityContext } from "@/lib/nav/nav-config";
import {
  maxInlineDomainsForTier,
  usePrimaryNavLayoutTier,
} from "@/lib/nav/use-primary-nav-layout-tier";
import type { PermissionKey } from "@/lib/permissions/permissions";
import {
  SCE_GLOBAL_APP_HEADER_CLASS,
  SCE_MOBILE_BOTTOM_NAV_CLASS,
} from "@/lib/shell/sce-app-shell-nav";
import type { WorkspaceContext } from "@/lib/workspace/workspace-context";
import { SceIcon } from "@/components/design-system/icons/SceIcon";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { NavDestinationSceIcon } from "@/components/nav/NavDestinationSceIcon";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
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

const DOMAIN_MESSAGE_KEY: Record<AppNavigationDomainId, `domains.${string}`> = {
  dashboard: "domains.dashboard",
  planning: "domains.planning",
  communication: "domains.communication",
  club: "domains.club",
  publishing: "domains.publishing",
  "platform-overview": "domains.platformOverview",
  "platform-governance": "domains.platformGovernance",
  "platform-commercial": "domains.platformCommercial",
  "platform-operations": "domains.platformOperations",
};

function DomainNavLink({
  domain,
  label,
  href,
  isActive,
}: {
  domain: NavigationDomain;
  label: string;
  href: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      data-nav-domain={domain.id}
      data-nav-domain-priority={domain.priority}
      data-sce-nav-l1-icon={domain.l1SceIconKey}
      className={cn(
        "sce-global-primary-nav-item sce-global-primary-nav-domain shrink-0",
        isActive && "sce-global-primary-nav-item--active",
      )}
    >
      <span className="sce-global-primary-nav-domain-icon" aria-hidden>
        <SceIcon name={domain.l1SceIconKey as SceIconRegistryName} size={18} />
      </span>
      <span className="sce-global-primary-nav-domain-label">{label}</span>
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
  const [globalNavDrawerOpen, setGlobalNavDrawerOpen] = useState(false);
  const [globalNavExplorerResetKey, setGlobalNavExplorerResetKey] = useState(0);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const globalNavDrawerId = useId();
  const layoutTier = usePrimaryNavLayoutTier();
  const t = useTranslations("AppShell");

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

  const domainLabel = useCallback(
    (domain: NavigationDomain) => t(DOMAIN_MESSAGE_KEY[domain.id]),
    [t],
  );

  const maxInline = maxInlineDomainsForTier(layoutTier);
  const { inlineDomains, overflowDomains } = useMemo(
    () => resolvePrimaryDomainPresentation(model.domains, active.activeDomainId, maxInline),
    [model.domains, active.activeDomainId, maxInline],
  );

  const mobileBottomDomains = useMemo(
    () => selectMobileBottomDomains(model, active.activeDomainId, 3),
    [model, active.activeDomainId],
  );

  const isDomainActive = useCallback(
    (domain: NavigationDomain) => {
      if (active.activeDomainId === domain.id) return true;
      return domain.destinations.some(
        (dest) =>
          isNavigationHrefActive(pathname, dest.href) ||
          (dest.children?.some((c) => isNavigationChildActive(pathname, c)) ?? false),
      );
    },
    [active.activeDomainId, pathname],
  );

  const isDomainSecondaryItemActive = useCallback(
    (domain: NavigationDomain, item: DomainSecondaryNavItem) =>
      isDomainHeaderSecondaryItemActive(
        pathname,
        domain,
        item,
        active.activeDestinationKey,
      ),
    [active.activeDestinationKey, pathname],
  );

  const openGlobalNavDrawer = useCallback(() => {
    setGlobalNavExplorerResetKey((key) => key + 1);
    setGlobalNavDrawerOpen(true);
  }, []);

  const closeGlobalNavDrawer = useCallback(() => setGlobalNavDrawerOpen(false), []);

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
            aria-label={t("primaryNavAria")}
            className="sce-global-primary-nav hidden md:flex min-w-0 flex-1 justify-center"
          >
            <div className="sce-global-primary-nav-track flex min-w-0 items-center gap-0.5">
              {inlineDomains.map((domain) => {
                const dest = active.activeDomainId === domain.id && active.activeDestination
                  ? active.activeDestination
                  : domain.defaultDestination;
                const href = resolveHref(dest.href);
                return (
                  <DomainNavLink
                    key={domain.id}
                    domain={domain}
                    label={domainLabel(domain)}
                    href={href}
                    isActive={isDomainActive(domain)}
                  />
                );
              })}

              {overflowDomains.length > 0 ? (
                <div className="relative sce-global-primary-nav-overflow shrink-0">
                  <button
                    type="button"
                    className={cn(
                      "sce-global-primary-nav-item",
                      overflowOpen && "sce-global-primary-nav-item--active",
                      overflowDomains.some((d) => d.id === active.activeDomainId) &&
                        "sce-global-primary-nav-item--active",
                    )}
                    aria-expanded={overflowOpen}
                    aria-haspopup="menu"
                    onClick={() => setOverflowOpen((v) => !v)}
                  >
                    {t("more")}
                    <MoreHorizontal className="ml-1 h-4 w-4 opacity-70" aria-hidden="true" />
                  </button>
                  {overflowOpen ? (
                    <div
                      role="menu"
                      className="sce-global-nav-overflow-panel absolute right-0 top-[calc(100%+4px)] z-50 min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--sce-app-chrome)] py-1 shadow-lg"
                    >
                      {overflowDomains.map((domain) => (
                        <Link
                          key={domain.id}
                          role="menuitem"
                          href={resolveHref(domain.defaultDestination.href)}
                          className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                          onClick={() => setOverflowOpen(false)}
                        >
                          {domainLabel(domain)}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1 sce-global-header-utilities">
            <button
              type="button"
              className={cn(
                "sce-icon-button min-h-[2.75rem] min-w-[2.75rem]",
                globalNavDrawerOpen && "sce-global-primary-nav-item--active",
              )}
              aria-label={t("openDrawer")}
              aria-expanded={globalNavDrawerOpen}
              aria-controls={globalNavDrawerId}
              data-testid="global-nav-hamburger"
              onClick={() =>
                globalNavDrawerOpen ? closeGlobalNavDrawer() : openGlobalNavDrawer()
              }
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

        {active.activeDomain && active.domainSecondaryItems.length > 0 ? (
          <nav
            aria-label={t("contextNavAria")}
            className="sce-global-context-nav hidden md:block border-t border-[color-mix(in_srgb,var(--border)_55%,transparent)]"
            data-testid="domain-secondary-nav"
          >
            <div className="sce-global-context-nav-track flex gap-1 overflow-x-auto px-4 py-1.5">
              {active.domainSecondaryItems.map((item) => {
                const itemHref = resolveHref(item.href);
                const isSecondaryActive = isDomainSecondaryItemActive(active.activeDomain!, item);
                const sceIcon = getNavDestinationSceIconName(item.key);
                return (
                  <Link
                    key={item.key}
                    href={itemHref}
                    aria-current={isSecondaryActive ? "page" : undefined}
                    data-nav-destination={item.key}
                    data-sce-nav-icon={sceIcon ?? undefined}
                    className={cn(
                      "sce-global-context-nav-item shrink-0",
                      sceIcon && "inline-flex items-center gap-1.5",
                      isSecondaryActive && "sce-global-context-nav-item--active",
                    )}
                  >
                    {sceIcon ? (
                      <NavDestinationSceIcon navItemKey={item.key} size={20} active={isSecondaryActive} />
                    ) : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}

        {active.moduleLocalChildren.length > 0 ? (
          <nav
            aria-label={t("moduleNavAria")}
            className="sce-global-module-nav hidden md:block border-t border-[color-mix(in_srgb,var(--border)_40%,transparent)]"
            data-testid="module-local-nav"
          >
            <div className="sce-global-context-nav-track flex gap-1 overflow-x-auto px-4 py-1.5">
              {active.moduleLocalChildren.map((child) => {
                const childHref = resolveHref(child.href);
                const isChildActive = isNavigationChildActive(pathname, child);
                return (
                  <Link
                    key={child.key}
                    href={childHref}
                    aria-current={isChildActive ? "page" : undefined}
                    className={cn(
                      "sce-global-context-nav-item shrink-0 text-[0.75rem]",
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
        aria-label={t("mobilePrimaryNavAria")}
        className={SCE_MOBILE_BOTTOM_NAV_CLASS}
        data-sce-mobile-bottom-nav
      >
        {mobileBottomDomains.map((domain) => {
          const dest =
            active.activeDomainId === domain.id && active.activeDestination
              ? active.activeDestination
              : domain.defaultDestination;
          const href = resolveHref(dest.href);
          const isActive = active.activeDomainId === domain.id;
          return (
            <Link
              key={domain.id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "sce-mobile-bottom-nav-item",
                isActive && "sce-mobile-bottom-nav-item--active",
              )}
            >
              {domainLabel(domain)}
            </Link>
          );
        })}
        <button
          type="button"
          className="sce-mobile-bottom-nav-item"
          aria-label={t("moreNavAria")}
          onClick={openGlobalNavDrawer}
        >
          {t("more")}
        </button>
      </nav>

      <GlobalNavDrawer
        panelId={globalNavDrawerId}
        open={globalNavDrawerOpen}
        onClose={closeGlobalNavDrawer}
        model={model}
        active={active}
        pathname={pathname}
        resolveHref={resolveHref}
        domainLabel={domainLabel}
        title={t("drawerTitle")}
        closeLabel={t("closeDrawer")}
        searchPlaceholder={t("searchModulesPlaceholder")}
        mobileBackLabel={t("explorerBackToDomains")}
        resetKey={globalNavExplorerResetKey}
      />
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
