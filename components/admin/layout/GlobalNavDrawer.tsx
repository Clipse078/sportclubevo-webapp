"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { NavDestinationSceIcon } from "@/components/nav/NavDestinationSceIcon";
import type { AppNavigationModel, ActiveAppNavigation } from "@/lib/nav/app-navigation-model";
import { isNavigationChildActive } from "@/lib/nav/app-navigation-model";
import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";
import {
  buildExplorerSearchIndex,
  filterExplorerSearchIndex,
  formatExplorerSearchHitContext,
  resolveExplorerGroupsForDomain,
  resolveExplorerModulesForDomain,
  resolveExplorerSearchHitNavKey,
  type ExplorerModuleEntry,
} from "@/lib/nav/app-navigation-explorer";
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
  searchPlaceholder: string;
  searchNoResultsLabel: string;
  explorerEmptyDomainLabel: string;
  mobileBackLabel: string;
  /** Bumped by the shell whenever the drawer opens to reset explorer UI state. */
  resetKey: number;
};

function resolveInitialExpandedModuleKey(
  active: ActiveAppNavigation,
  modules: ReturnType<typeof resolveExplorerModulesForDomain>,
): string | null {
  const activeModuleKey =
    active.activeChildKey != null
      ? modules.find((module) =>
          module.children.some((child) => child.key === active.activeChildKey),
        )?.key ?? active.activeDestinationKey
      : active.activeDestinationKey;
  if (activeModuleKey && modules.some((module) => module.key === activeModuleKey)) {
    return activeModuleKey;
  }
  return null;
}

type ExplorerPanelProps = Omit<
  GlobalNavDrawerProps,
  "open" | "resetKey" | "onClose"
> & {
  onClose: () => void;
  initialDomainId: AppNavigationDomainId | null;
};

type ExplorerModuleCardProps = {
  panelId: string;
  module: ExplorerModuleEntry;
  pathname: string;
  active: ActiveAppNavigation;
  resolveHref: (href: string) => string;
  expandedModuleKey: string | null;
  setExpandedModuleKey: Dispatch<SetStateAction<string | null>>;
  onNavigate: () => void;
};

function ExplorerModuleCard({
  panelId,
  module,
  pathname,
  active,
  resolveHref,
  expandedModuleKey,
  setExpandedModuleKey,
  onNavigate,
}: ExplorerModuleCardProps) {
  const moduleActive =
    active.activeDestinationKey === module.key ||
    module.children.some((child) => isNavigationChildActive(pathname, child));
  const isExpanded = expandedModuleKey === module.key;
  const hasChildren = module.children.length > 0;

  return (
    <li className="min-w-0 sm:col-span-1">
      <div
        className={cn(
          "rounded-lg border border-[color-mix(in_srgb,var(--border)_70%,transparent)]",
          moduleActive &&
            "border-[color-mix(in_srgb,var(--sce-primary)_35%,var(--border))]",
        )}
      >
        <div className="flex items-stretch">
          <Link
            href={resolveHref(module.href)}
            className={cn(
              "flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-sm font-medium text-[var(--foreground)] no-underline",
              "hover:bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)]",
              moduleActive && "text-[var(--sce-primary)]",
            )}
            aria-current={moduleActive && !hasChildren ? "page" : undefined}
            onClick={onNavigate}
          >
            <NavDestinationSceIcon
              navItemKey={module.key}
              size={20}
              active={moduleActive}
              fallbackGenericModuleGlyph
            />
            <span className="truncate">{module.label}</span>
          </Link>
          {hasChildren ? (
            <button
              type="button"
              className="sce-icon-button min-h-[2.75rem] min-w-[2.75rem] shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]"
              aria-expanded={isExpanded}
              aria-controls={`${panelId}-module-${module.key}`}
              data-testid={`global-nav-explorer-expand-${module.key}`}
              onClick={() =>
                setExpandedModuleKey((current) => (current === module.key ? null : module.key))
              }
            >
              ▾
            </button>
          ) : null}
        </div>
        {hasChildren && isExpanded ? (
          <ul
            id={`${panelId}-module-${module.key}`}
            className="space-y-0.5 border-t border-[color-mix(in_srgb,var(--border)_65%,transparent)] px-1 py-0.5"
          >
            {module.children.map((child) => {
              const childActive = isNavigationChildActive(pathname, child);
              return (
                <li key={child.key}>
                  <Link
                    href={resolveHref(child.href)}
                    className={cn(
                      "block min-h-[2.75rem] rounded-md px-2 py-1.5 text-[0.8125rem] leading-snug text-[var(--text-2)]",
                      "hover:bg-[color-mix(in_srgb,var(--surface-2)_90%,transparent)] hover:text-[var(--foreground)]",
                      childActive &&
                        "bg-[color-mix(in_srgb,var(--sce-primary)_10%,transparent)] font-semibold text-[var(--sce-primary)]",
                    )}
                    aria-current={childActive ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function GlobalNavExplorerPanel({
  panelId,
  onClose,
  model,
  active,
  pathname,
  resolveHref,
  domainLabel,
  title,
  closeLabel,
  searchPlaceholder,
  searchNoResultsLabel,
  explorerEmptyDomainLabel,
  mobileBackLabel,
  initialDomainId,
}: ExplorerPanelProps) {
  const searchInputId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState<AppNavigationDomainId | null>(
    initialDomainId,
  );
  const [mobilePane, setMobilePane] = useState<"domains" | "modules">("domains");

  const selectedDomain = useMemo(
    () => model.domains.find((domain) => domain.id === selectedDomainId) ?? null,
    [model.domains, selectedDomainId],
  );

  const modules = useMemo(
    () => (selectedDomain ? resolveExplorerModulesForDomain(selectedDomain) : []),
    [selectedDomain],
  );

  const moduleGroups = useMemo(
    () => (selectedDomain ? resolveExplorerGroupsForDomain(selectedDomain) : null),
    [selectedDomain],
  );

  const [expandedModuleKey, setExpandedModuleKey] = useState<string | null>(() => {
    const domain = model.domains.find((entry) => entry.id === initialDomainId) ?? null;
    const initialModules = domain ? resolveExplorerModulesForDomain(domain) : [];
    return resolveInitialExpandedModuleKey(active, initialModules);
  });

  const searchIndex = useMemo(
    () => buildExplorerSearchIndex(model, domainLabel),
    [model, domainLabel],
  );

  const searchResults = useMemo(
    () => filterExplorerSearchIndex(searchIndex, searchQuery),
    [searchIndex, searchQuery],
  );

  const handleNavigate = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelectDomain = useCallback((domainId: AppNavigationDomainId) => {
    setSelectedDomainId(domainId);
    setExpandedModuleKey(null);
    setMobilePane("modules");
  }, []);

  const isSearchActive = searchQuery.trim().length > 0;

  const searchField = (
    <div
      className="shrink-0 border-b border-[color-mix(in_srgb,var(--border)_65%,transparent)] px-3 py-2"
      data-testid="global-nav-explorer-search-shell"
    >
      <label htmlFor={searchInputId} className="sr-only">
        {searchPlaceholder}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          id={searchInputId}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          data-testid="global-nav-explorer-search"
          autoComplete="off"
        />
      </div>
    </div>
  );

  const domainRail = (
    <div
      className="sce-app-explorer-domain-rail sce-app-explorer-scroll flex min-h-0 shrink-0 flex-col gap-0.5 overflow-y-auto border-[var(--border)] md:w-[9.5rem] md:border-r md:py-2 md:pr-1"
      role="tablist"
      aria-label={title}
      data-testid="global-nav-explorer-domain-rail"
    >
      {model.domains.map((domain) => {
        const isSelected = domain.id === selectedDomainId;
        return (
          <button
            key={domain.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`global-nav-explorer-domain-${domain.id}`}
            className={cn(
              "rounded-md px-2.5 py-2 text-left text-[0.8125rem] font-semibold text-[var(--text-2)] motion-safe:transition-colors",
              "hover:bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)] hover:text-[var(--foreground)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              isSelected &&
                "bg-[color-mix(in_srgb,var(--sce-primary)_12%,transparent)] text-[var(--sce-primary)]",
            )}
            onClick={() => handleSelectDomain(domain.id)}
          >
            {domainLabel(domain)}
          </button>
        );
      })}
    </div>
  );

  const modulePane = (
    <div
      className="sce-app-explorer-module-pane sce-app-explorer-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4"
      data-testid="global-nav-explorer-module-pane"
    >
      {isSearchActive ? (
        <ul className="space-y-1" data-testid="global-nav-explorer-search-results">
          {searchResults.length === 0 ? (
            <li
              className="px-1 py-2 text-sm text-[var(--muted)]"
              data-testid="global-nav-explorer-search-empty"
            >
              {searchNoResultsLabel}
            </li>
          ) : (
            searchResults.map((hit) => (
              <li key={`${hit.kind}:${hit.key}`}>
                <Link
                  href={resolveHref(hit.href)}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-[color-mix(in_srgb,var(--surface-2)_90%,transparent)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                  )}
                  onClick={handleNavigate}
                >
                  <NavDestinationSceIcon
                    navItemKey={resolveExplorerSearchHitNavKey(hit) ?? ""}
                    size={20}
                    fallbackGenericModuleGlyph
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--foreground)]">
                      {hit.label}
                    </span>
                    <span className="block text-xs text-[var(--muted)]">
                      {formatExplorerSearchHitContext(hit)}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : selectedDomain ? (
        <>
          <p className="mb-2 px-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--muted)]">
            {domainLabel(selectedDomain)}
          </p>
          {modules.length === 0 ? (
            <p
              className="px-0.5 text-sm text-[var(--muted)]"
              data-testid="global-nav-explorer-domain-empty"
            >
              {explorerEmptyDomainLabel}
            </p>
          ) : moduleGroups ? (
            <div className="space-y-4" data-testid="global-nav-drawer-tree">
              {moduleGroups.map((group) => (
                <section
                  key={group.id}
                  aria-labelledby={`${panelId}-explorer-group-${group.id}`}
                  data-testid={`global-nav-explorer-group-${group.id}`}
                >
                  <h3
                    id={`${panelId}-explorer-group-${group.id}`}
                    className="mb-1.5 px-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--muted)]"
                  >
                    {group.label}
                  </h3>
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {group.modules.map((module) => (
                      <ExplorerModuleCard
                        key={module.key}
                        panelId={panelId}
                        module={module}
                        pathname={pathname}
                        active={active}
                        resolveHref={resolveHref}
                        expandedModuleKey={expandedModuleKey}
                        setExpandedModuleKey={setExpandedModuleKey}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2" data-testid="global-nav-drawer-tree">
              {modules.map((module) => (
                <ExplorerModuleCard
                  key={module.key}
                  panelId={panelId}
                  module={module}
                  pathname={pathname}
                  active={active}
                  resolveHref={resolveHref}
                  expandedModuleKey={expandedModuleKey}
                  setExpandedModuleKey={setExpandedModuleKey}
                  onNavigate={handleNavigate}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <div
        className="flex shrink-0 items-center justify-between border-b border-[color-mix(in_srgb,var(--border)_70%,transparent)] px-4 py-3"
        data-testid="global-nav-explorer-header"
      >
        <div className="flex min-w-0 items-center gap-2">
          {mobilePane === "modules" ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-[var(--text-2)] md:hidden"
              onClick={() => setMobilePane("domains")}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {mobileBackLabel}
            </button>
          ) : null}
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        </div>
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

      {searchField}

      <div
        className="flex min-h-0 flex-1 flex-col md:flex-row"
        data-testid="global-nav-explorer-workspace"
      >
        <div className={cn("min-h-0 md:flex md:shrink-0", mobilePane === "modules" && "hidden md:flex")}>
          {domainRail}
        </div>
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            mobilePane === "domains" && "hidden md:flex",
          )}
        >
          {modulePane}
        </div>
      </div>
    </>
  );
}

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
  searchPlaceholder,
  searchNoResultsLabel,
  explorerEmptyDomainLabel,
  mobileBackLabel,
  resetKey,
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

  const initialDomainId = active.activeDomainId ?? model.domains[0]?.id ?? null;

  return (
    <div
      className="sce-global-nav-drawer-backdrop fixed inset-0 z-[80] bg-black/35 backdrop-blur-[2px]"
      role="presentation"
      data-testid="global-nav-drawer-backdrop"
      onClick={onClose}
    >
      <div
        id={panelId}
        className={cn(
          "sce-global-nav-drawer sce-app-explorer-panel absolute left-0 top-0 flex h-full flex-col",
          "w-[min(100%,680px)] border-r border-[color-mix(in_srgb,var(--border)_75%,transparent)]",
          "bg-[color-mix(in_srgb,rgba(15,23,42,0.88)_92%,transparent)] shadow-2xl backdrop-blur-xl",
          "supports-[backdrop-filter]:bg-[color-mix(in_srgb,rgba(15,23,42,0.78)_88%,transparent)]",
        )}
        style={{ width: "clamp(320px, 92vw, 680px)" }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="global-nav-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <GlobalNavExplorerPanel
          key={resetKey}
          panelId={panelId}
          onClose={onClose}
          model={model}
          active={active}
          pathname={pathname}
          resolveHref={resolveHref}
          domainLabel={domainLabel}
          title={title}
          closeLabel={closeLabel}
          searchPlaceholder={searchPlaceholder}
          searchNoResultsLabel={searchNoResultsLabel}
          explorerEmptyDomainLabel={explorerEmptyDomainLabel}
          mobileBackLabel={mobileBackLabel}
          initialDomainId={initialDomainId}
        />
      </div>
    </div>
  );
}
