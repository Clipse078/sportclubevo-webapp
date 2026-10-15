"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useId,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { useTranslations } from "next-intl";
import GlobalNavDrawer from "@/components/admin/layout/GlobalNavDrawer";
import {
  buildAppNavigationModelForUser,
  buildNavigationHref,
  isDomainHeaderSecondaryItemActive,
  isModuleLocalChildPrimaryActive,
  resolveActiveAppNavigation,
  resolvePrimaryDomainPresentation,
  selectMobileBottomDomains,
  type DomainSecondaryNavItem,
} from "@/lib/nav/app-navigation-model";
import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";
import type { NavCapabilityContext, NavItemChild } from "@/lib/nav/nav-config";
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
import { cn } from "@/lib/cn";
import { usePermissionAwareRoutePrefetch } from "@/lib/nav/use-permission-aware-route-prefetch";
import {
  SceContextNavigation,
  SceGlobalUtilities,
  SceModuleNavigation,
  SceNavigationSpineRow,
  ScePrimaryNavigation,
  SceTenantIdentityBar,
} from "@/components/sce/navigation";

type AppShellNavigationProps = {
  permissionKeys: string[];
  workspaceContext?: WorkspaceContext;
  clubName?: string;
  logoUrl?: string | null;
  navCapabilities?: NavCapabilityContext;
  activeSeasonLabel?: string | null;
  activeSeasonKey?: string | null;
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
  admin: "domains.admin",
  "platform-overview": "domains.platformOverview",
  "platform-governance": "domains.platformGovernance",
  "platform-commercial": "domains.platformCommercial",
  "platform-operations": "domains.platformOperations",
};

function AppShellNavigationInner({
  permissionKeys,
  workspaceContext = "club",
  clubName,
  logoUrl,
  navCapabilities,
  activeSeasonLabel,
  activeSeasonKey,
  firstName,
  lastName,
  email,
  imageUrl,
}: AppShellNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
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

  usePermissionAwareRoutePrefetch({
    permissionKeys: permissionKeys as PermissionKey[],
    workspaceContext,
    navCapabilities,
  });

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

  const showGlobalNavExplorer =
    layoutTier !== "desktop" || overflowDomains.length > 0 || inlineDomains.length < model.domains.length;

  const mobileBottomDomains = useMemo(
    () => selectMobileBottomDomains(model, active.activeDomainId, 3),
    [model, active.activeDomainId],
  );

  const isDomainActive = useCallback(
    (domain: NavigationDomain) => active.activeDomainId === domain.id,
    [active.activeDomainId],
  );

  const isDomainSecondaryItemActive = useCallback(
    (domain: NavigationDomain, item: DomainSecondaryNavItem) =>
      isDomainHeaderSecondaryItemActive(
        pathname,
        domain,
        item,
        active.activeDestinationKey,
        active.activeChildKey,
        active.domainSecondaryItems,
      ),
    [
      active.activeChildKey,
      active.activeDestinationKey,
      active.domainSecondaryItems,
      pathname,
    ],
  );

  const openGlobalNavDrawer = useCallback(() => {
    setGlobalNavExplorerResetKey((key) => key + 1);
    setGlobalNavDrawerOpen(true);
  }, []);

  const closeGlobalNavDrawer = useCallback(() => setGlobalNavDrawerOpen(false), []);

  const navigateToModuleLocalSibling = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, child: NavItemChild) => {
      const childHref = resolveHref(child.href);
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.defaultPrevented
      ) {
        return;
      }
      const childPathname = childHref.split("?")[0] ?? childHref;
      if (childPathname === pathname) return;
      if (
        pathname.startsWith(`${childPathname}/`) ||
        (child.matchExact && pathname.startsWith(`${child.href}/`))
      ) {
        event.preventDefault();
        router.push(childHref);
      }
    },
    [pathname, resolveHref, router],
  );

  return (
    <>
      <header className={SCE_GLOBAL_APP_HEADER_CLASS} data-testid="sce-global-navigation">
        <SceNavigationSpineRow
          variant="primary"
          className="sce-global-app-header-row sce-global-app-header-row--primary"
          brand={
            <SceTenantIdentityBar
              displayClubName={displayClubName}
              logoUrl={logoUrl}
              platformWorkspace={isPlatformWorkspace}
            />
          }
          workspace={
            <ScePrimaryNavigation
              ariaLabel={t("primaryNavAria")}
              className="sce-global-primary-nav hidden md:flex min-w-0 w-full"
              inlineDomains={inlineDomains}
              overflowDomains={overflowDomains}
              activeDomainId={active.activeDomainId}
              activeDestination={active.activeDestination}
              overflowOpen={overflowOpen}
              onOverflowToggle={() => setOverflowOpen((v) => !v)}
              onOverflowNavigate={() => setOverflowOpen(false)}
              resolveHref={resolveHref}
              domainLabel={domainLabel}
              isDomainActive={isDomainActive}
              moreLabel={t("more")}
            />
          }
          utilities={
            <SceGlobalUtilities
              platformWorkspace={isPlatformWorkspace}
              activeSeasonLabel={activeSeasonLabel}
              activeSeasonKey={activeSeasonKey}
              selectedSeasonKey={selectedSeason}
              seasonSwitchLabel={t("seasonSwitchAria")}
              globalNavDrawerOpen={globalNavDrawerOpen}
              globalNavDrawerId={globalNavDrawerId}
              openDrawerLabel={t("openDrawer")}
              onToggleDrawer={() =>
                globalNavDrawerOpen ? closeGlobalNavDrawer() : openGlobalNavDrawer()
              }
              showGlobalNavExplorer={showGlobalNavExplorer}
              firstName={firstName}
              lastName={lastName}
              email={email}
              imageUrl={imageUrl}
            />
          }
        />

        {active.activeDomain && active.domainSecondaryItems.length > 0 ? (
          <SceModuleNavigation
            ariaLabel={t("moduleNavAria")}
            items={active.domainSecondaryItems}
            resolveHref={resolveHref}
            isItemActive={(item) => isDomainSecondaryItemActive(active.activeDomain!, item)}
          />
        ) : null}

        {active.moduleLocalChildren.length > 0 ? (
          <SceContextNavigation
            ariaLabel={t("contextNavAria")}
            items={active.moduleLocalChildren}
            pathname={pathname}
            resolveHref={resolveHref}
            isItemActive={(child) =>
              isModuleLocalChildPrimaryActive(
                pathname,
                child,
                active.moduleLocalChildren,
                active.activeChildKey,
              )
            }
            onNavigateSibling={navigateToModuleLocalSibling}
          />
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
        searchNoResultsLabel={t("searchNoResults")}
        explorerEmptyDomainLabel={t("explorerEmptyDomain")}
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
