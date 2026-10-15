"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
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
  resolveDesktopPrimaryNavigationDomains,
  resolveDomainNavigationPanelInitialL2Key,
  resolveDomainSecondaryNavItems,
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
  SceDomainNavigationPanel,
  SceGlobalUtilities,
  SceNavigationSpineRow,
  ScePrimaryNavigation,
  ScePlatformBrandRail,
  SceTenantContextRail,
  SceTenantIdentityBar,
  SceTenantContextRow,
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
  const [openDomainPanelId, setOpenDomainPanelId] = useState<AppNavigationDomainId | null>(
    null,
  );
  const globalNavDrawerId = useId();
  const domainPanelId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const domainPanelTriggerRefs = useRef(new Map<AppNavigationDomainId, HTMLButtonElement>());
  const lastDomainPanelTriggerRef = useRef<HTMLButtonElement | null>(null);
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

  const primaryRowDomains = useMemo(
    () => resolveDesktopPrimaryNavigationDomains(model.domains, workspaceContext),
    [model.domains, workspaceContext],
  );

  const maxInline = maxInlineDomainsForTier(layoutTier);
  const { inlineDomains, overflowDomains } = useMemo(
    () =>
      resolvePrimaryDomainPresentation(primaryRowDomains, active.activeDomainId, maxInline),
    [primaryRowDomains, active.activeDomainId, maxInline],
  );

  const homeHref = resolveHref("/dashboard");

  const tenantContextRail = (
    <SceTenantContextRail
      displayClubName={displayClubName}
      logoUrl={logoUrl}
      platformWorkspace={isPlatformWorkspace}
      className="hidden md:flex"
      homeHref={isPlatformWorkspace ? undefined : homeHref}
    />
  );

  const showGlobalNavExplorer =
    layoutTier !== "desktop" ||
    overflowDomains.length > 0 ||
    inlineDomains.length < primaryRowDomains.length;

  const mobileBottomDomains = useMemo(
    () => selectMobileBottomDomains(model, active.activeDomainId, 3),
    [model, active.activeDomainId],
  );

  const isDomainActive = useCallback(
    (domain: NavigationDomain) => {
      if (active.activeDomainId === "dashboard") return false;
      return active.activeDomainId === domain.id;
    },
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

  const domainHasNavigationPanel = useCallback(
    (domain: NavigationDomain) => resolveDomainSecondaryNavItems(domain).length > 0,
    [],
  );

  const registerDomainPanelTrigger = useCallback(
    (domainId: AppNavigationDomainId, node: HTMLButtonElement | null) => {
      if (node) {
        domainPanelTriggerRefs.current.set(domainId, node);
        return;
      }
      domainPanelTriggerRefs.current.delete(domainId);
    },
    [],
  );

  const domainPanelControlsId = useCallback(
    (domainId: AppNavigationDomainId) => `${domainPanelId}-${domainId}`,
    [domainPanelId],
  );

  const closeDomainPanel = useCallback(() => {
    setOpenDomainPanelId(null);
  }, []);

  const onDomainPanelToggle = useCallback(
    (domain: NavigationDomain, trigger: HTMLButtonElement | null) => {
      lastDomainPanelTriggerRef.current = trigger;
      setOverflowOpen(false);
      setOpenDomainPanelId((current) => (current === domain.id ? null : domain.id));
    },
    [],
  );

  const openDomainPanel = useMemo(() => {
    if (!openDomainPanelId) return null;
    return model.domains.find((domain) => domain.id === openDomainPanelId) ?? null;
  }, [model.domains, openDomainPanelId]);

  const openDomainPanelItems = useMemo(
    () => resolveDomainSecondaryNavItems(openDomainPanel),
    [openDomainPanel],
  );

  const openDomainPanelInitialL2Key = useMemo(() => {
    if (!openDomainPanel) return null;
    return resolveDomainNavigationPanelInitialL2Key(openDomainPanel, openDomainPanelItems, active);
  }, [active, openDomainPanel, openDomainPanelItems]);

  useEffect(() => {
    closeDomainPanel();
  }, [pathname, closeDomainPanel]);

  useEffect(() => {
    if (!openDomainPanelId) return;

    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      const panel = document.querySelector('[data-testid="sce-domain-nav-panel"]');
      if (panel?.contains(target)) return;
      if (target instanceof Element && target.closest("button[data-nav-domain]")) {
        return;
      }
      closeDomainPanel();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDomainPanel();
      const restore =
        lastDomainPanelTriggerRef.current ??
        (openDomainPanelId
          ? domainPanelTriggerRefs.current.get(openDomainPanelId)
          : undefined);
      restore?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openDomainPanelId, closeDomainPanel]);

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
      <header
        ref={headerRef}
        className={SCE_GLOBAL_APP_HEADER_CLASS}
        data-testid="sce-global-navigation"
      >
        <SceNavigationSpineRow
          variant="primary"
          className="sce-global-app-header-row sce-global-app-header-row--primary"
          brand={
            <>
              <ScePlatformBrandRail className="hidden md:flex" homeHref={homeHref} />
              <div className="md:hidden w-full min-w-0">
                <SceTenantIdentityBar
                  displayClubName={displayClubName}
                  logoUrl={logoUrl}
                  platformWorkspace={isPlatformWorkspace}
                />
              </div>
            </>
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
              openDomainPanelId={openDomainPanelId}
              onDomainPanelToggle={onDomainPanelToggle}
              domainHasNavigationPanel={domainHasNavigationPanel}
              registerDomainPanelTrigger={registerDomainPanelTrigger}
              domainPanelControlsId={domainPanelControlsId}
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

        <SceTenantContextRow ariaLabel={t("moduleNavAria")} brand={tenantContextRail} />

        {openDomainPanel && openDomainPanelItems.length > 0 ? (
          <SceDomainNavigationPanel
            panelId={domainPanelControlsId(openDomainPanel.id)}
            open={openDomainPanelId === openDomainPanel.id}
            headerRef={headerRef}
            domain={openDomainPanel}
            domainHeading={domainLabel(openDomainPanel)}
            items={openDomainPanelItems}
            initialL2Key={openDomainPanelInitialL2Key}
            resolveHref={resolveHref}
            isL2Active={(item) => isDomainSecondaryItemActive(openDomainPanel, item)}
            isL3Active={(child) => {
              if (child.key.endsWith("__domain-panel-overview")) {
                const parentKey = child.key.replace("__domain-panel-overview", "");
                const parent = openDomainPanelItems.find((entry) => entry.key === parentKey);
                if (!parent) return false;
                if (active.activeChildKey != null) return false;
                return isDomainSecondaryItemActive(openDomainPanel, parent);
              }
              return isModuleLocalChildPrimaryActive(
                pathname,
                child,
                active.moduleLocalChildren,
                active.activeChildKey,
              );
            }}
            onNavigateSibling={navigateToModuleLocalSibling}
            onClose={closeDomainPanel}
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
