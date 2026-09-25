"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { ChevronLeft, LayoutGrid, Search } from "lucide-react";
import type { AppNavigationModel, ActiveAppNavigation } from "@/lib/nav/app-navigation-model";
import { isNavigationChildActive } from "@/lib/nav/app-navigation-model";
import type { AppNavigationDomainId, NavigationDomain } from "@/lib/nav/app-navigation-domains";
import {
  buildExplorerSearchIndex,
  filterExplorerSearchIndex,
  resolveExplorerModulesForDomain,
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

  const domainRail = (
    <div
      className="sce-app-explorer-domain-rail flex shrink-0 flex-col gap-0.5 border-[var(--border)] md:w-[9.5rem] md:border-r md:py-2 md:pr-1"
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
      className="sce-app-explorer-module-pane min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4"
      data-testid="global-nav-explorer-module-pane"
    >
      {isSearchActive ? (
        <ul className="space-y-1" data-testid="global-nav-explorer-search-results">
          {searchResults.length === 0 ? (
            <li className="px-1 py-2 text-sm text-[var(--muted)]">—</li>
          ) : (
            searchResults.map((hit) => (
              <li key={`${hit.kind}:${hit.key}`}>
                <Link
                  href={resolveHref(hit.href)}
                  className={cn(
                    "block rounded-lg px-2 py-2 hover:bg-[color-mix(in_srgb,var(--surface-2)_90%,transparent)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                  )}
                  onClick={handleNavigate}
                >
                  <span className="block text-sm font-semibold text-[var(--foreground)]">
                    {hit.label}
                  </span>
                  <span className="block text-xs text-[var(--muted)]">
                    {hit.moduleLabel ? `${hit.domainLabel} · ${hit.moduleLabel}` : hit.domainLabel}
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
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2" data-testid="global-nav-drawer-tree">
            {modules.map((module) => {
              const moduleActive =
                active.activeDestinationKey === module.key ||
                module.children.some((child) => isNavigationChildActive(pathname, child));
              const isExpanded = expandedModuleKey === module.key;
              const hasChildren = module.children.length > 0;

              return (
                <li key={module.key} className="min-w-0 sm:col-span-1">
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
                          "flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-sm font-medium text-[var(--foreground)] no-underline",
                          "hover:bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)]",
                          moduleActive && "text-[var(--sce-primary)]",
                        )}
                        aria-current={moduleActive && !hasChildren ? "page" : undefined}
                        onClick={handleNavigate}
                      >
                        <LayoutGrid
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            moduleActive ? "text-[var(--sce-primary)]" : "text-[var(--muted)]",
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{module.label}</span>
                      </Link>
                      {hasChildren ? (
                        <button
                          type="button"
                          className="shrink-0 px-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                          aria-expanded={isExpanded}
                          aria-controls={`${panelId}-module-${module.key}`}
                          data-testid={`global-nav-explorer-expand-${module.key}`}
                          onClick={() =>
                            setExpandedModuleKey((current) =>
                              current === module.key ? null : module.key,
                            )
                          }
                        >
                          ▾
                        </button>
                      ) : null}
                    </div>
                    {hasChildren && isExpanded ? (
                      <ul
                        id={`${panelId}-module-${module.key}`}
                        className="border-t border-[color-mix(in_srgb,var(--border)_65%,transparent)] px-1 py-1"
                      >
                        {module.children.map((child) => {
                          const childActive = isNavigationChildActive(pathname, child);
                          return (
                            <li key={child.key}>
                              <Link
                                href={resolveHref(child.href)}
                                className={cn(
                                  "block rounded-md px-2 py-1.5 text-[0.8125rem] text-[var(--text-2)]",
                                  "hover:bg-[color-mix(in_srgb,var(--surface-2)_90%,transparent)] hover:text-[var(--foreground)]",
                                  childActive &&
                                    "font-semibold text-[var(--sce-primary)] bg-[color-mix(in_srgb,var(--sce-primary)_10%,transparent)]",
                                )}
                                aria-current={childActive ? "page" : undefined}
                                onClick={handleNavigate}
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
            })}
          </ul>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-[color-mix(in_srgb,var(--border)_70%,transparent)] px-4 py-3">
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

      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--border)_65%,transparent)] px-3 py-2 md:hidden">
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

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className={cn(mobilePane === "modules" && "hidden md:block")}>{domainRail}</div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            mobilePane === "domains" && "hidden md:flex",
          )}
        >
          {modulePane}
        </div>
      </div>

      <div className="hidden shrink-0 border-t border-[color-mix(in_srgb,var(--border)_65%,transparent)] px-3 py-2.5 md:block">
        <label htmlFor={`${searchInputId}-desktop`} className="sr-only">
          {searchPlaceholder}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <input
            id={`${searchInputId}-desktop`}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            data-testid="global-nav-explorer-search-desktop"
            autoComplete="off"
          />
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
          mobileBackLabel={mobileBackLabel}
          initialDomainId={initialDomainId}
        />
      </div>
    </div>
  );
}
