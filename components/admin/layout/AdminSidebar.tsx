"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SidebarBrandHeader from "@/components/admin/branding/SidebarBrandHeader";
import SidebarPlatformBrand from "@/components/admin/branding/SidebarPlatformBrand";
import { AnimatedNavIcon } from "@/components/ui/motion/AnimatedNavIcon";
import { useSidebarResize } from "@/hooks/useSidebarResize";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import type { NavItem, NavSection } from "@/lib/nav/nav-config";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type { WorkspaceContext } from "@/lib/workspace/workspace-context";
import {
  persistSidebarCollapsed,
  readStoredSidebarCollapsed,
} from "@/lib/shell/sidebar-collapsed";
import { cn } from "@/lib/cn";

type AdminSidebarProps = {
  permissionKeys: string[];
  workspaceContext?: WorkspaceContext;
  /** Tenant display name. Falls back to "SportClubEvo" when not provided. */
  clubName?: string;
  /** Raw logoUrl from tenant config. Null/invalid → fallback icon. */
  logoUrl?: string | null;
  collapsed?: boolean;
  onToggle?: () => void;
};

const SEASON_CARRY_PREFIXES = [
  "/dashboard",
  "/dashboard/seasons",
  "/dashboard/planner",
  "/dashboard/teams",
  "/dashboard/events",
];

function shouldCarrySeason(href: string) {
  return SEASON_CARRY_PREFIXES.some(
    (prefix) =>
      href === prefix ||
      href.startsWith(prefix + "/") ||
      href.startsWith(prefix + "?"),
  );
}

function resolveActiveModuleKey(
  sections: NavSection[],
  isItemActive: (href: string) => boolean,
): string | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (isItemActive(item.href)) return item.key;
      if (item.children?.some((child) => isItemActive(child.href))) {
        return item.key;
      }
    }
  }
  return null;
}

function moduleHasChildren(item: NavItem): boolean {
  return !!item.children && item.children.length > 0;
}

function moduleIsActive(item: NavItem, isItemActive: (href: string) => boolean): boolean {
  if (isItemActive(item.href)) return true;
  return item.children?.some((child) => isItemActive(child.href)) ?? false;
}

export default function AdminSidebar({
  permissionKeys,
  workspaceContext = "club",
  clubName,
  logoUrl,
  collapsed,
  onToggle,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSeason = searchParams.get("season");

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [collapsedHydrated, setCollapsedHydrated] = useState(false);

  useEffect(() => {
    setInternalCollapsed(readStoredSidebarCollapsed());
    setCollapsedHydrated(true);
  }, []);

  const isCollapsed =
    typeof collapsed === "boolean" ? collapsed : internalCollapsed;

  const handleToggle = useCallback(() => {
    const next = !isCollapsed;
    if (typeof collapsed !== "boolean") {
      setInternalCollapsed(next);
      persistSidebarCollapsed(next);
    }
    if (typeof onToggle === "function") {
      onToggle();
    }
  }, [collapsed, isCollapsed, onToggle]);

  const { isResizing, onResizePointerDown, onResizeKeyDown } = useSidebarResize({
    collapsed: isCollapsed,
  });

  const sections: NavSection[] = getVisibleNavSections(
    permissionKeys as PermissionKey[],
    workspaceContext,
  );

  const isPlatformWorkspace = workspaceContext === "platform";
  const displayClubName = isPlatformWorkspace
    ? "SportClubEvo Platform"
    : (clubName ?? "SportClubEvo");

  function buildHref(baseHref: string) {
    if (!selectedSeason || !shouldCarrySeason(baseHref)) return baseHref;
    return `${baseHref}?season=${encodeURIComponent(selectedSeason)}`;
  }

  function isItemActive(href: string): boolean {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  }

  const activeModuleKey = useMemo(
    () => resolveActiveModuleKey(sections, isItemActive),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname drives active matching
    [sections, pathname],
  );

  const [expandedModuleKey, setExpandedModuleKey] = useState<string | null>(null);

  useEffect(() => {
    if (activeModuleKey) {
      setExpandedModuleKey(activeModuleKey);
    }
  }, [activeModuleKey]);

  const handleModuleToggle = useCallback(
    (moduleKey: string) => {
      setExpandedModuleKey((current) => {
        if (current === moduleKey) {
          if (moduleKey === activeModuleKey) return moduleKey;
          return null;
        }
        return moduleKey;
      });
    },
    [activeModuleKey],
  );

  function renderModuleItem(item: NavItem) {
    const resolvedHref = buildHref(item.href);
    const hasChildren = moduleHasChildren(item);
    const isActive = moduleIsActive(item, isItemActive);
    const isExpanded = !isCollapsed && hasChildren && expandedModuleKey === item.key;

    if (isCollapsed) {
      return (
        <li key={item.key}>
          <Link
            href={resolvedHref}
            title={item.label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "sce-nav-item justify-center px-2",
              isActive && "active",
            )}
          >
            <span className="sce-nav-icon-wrap" aria-hidden={false}>
              <AnimatedNavIcon label={item.label} active={isActive} variant="parent" />
            </span>
            <span className="sr-only">{item.label}</span>
          </Link>
        </li>
      );
    }

    if (!hasChildren) {
      return (
        <li key={item.key}>
          <Link
            href={resolvedHref}
            aria-current={isActive ? "page" : undefined}
            className={cn("sce-nav-item", isActive && "active")}
          >
            <span className="sce-nav-icon-wrap" aria-hidden={false}>
              <AnimatedNavIcon label={item.label} active={isActive} variant="parent" />
            </span>
            <span>{item.label}</span>
          </Link>
        </li>
      );
    }

    return (
      <li key={item.key} className={cn("sce-nav-module", isActive && "sce-nav-module--active")}>
        <div
          className={cn(
            "sce-nav-module-row",
            isActive && "sce-nav-module-row--active",
          )}
        >
          <Link
            href={resolvedHref}
            aria-current={isActive && isItemActive(item.href) ? "page" : undefined}
            className={cn(
              "sce-nav-item sce-nav-module-link no-underline text-inherit",
              isActive && "active",
            )}
          >
            <span className="sce-nav-icon-wrap" aria-hidden={false}>
              <AnimatedNavIcon label={item.label} active={isActive} variant="parent" />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>

          <button
            type="button"
            className="sce-nav-module-chevron"
            aria-expanded={isExpanded}
            aria-controls={`nav-module-${item.key}`}
            aria-label={`${item.label} ${isExpanded ? "einklappen" : "ausklappen"}`}
            onClick={() => handleModuleToggle(item.key)}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 motion-safe:transition-transform motion-safe:duration-150",
                isExpanded && "rotate-90",
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        {isExpanded && (
          <ul
            id={`nav-module-${item.key}`}
            className="sce-nav-module-children"
          >
            {item.children!.map((child) => {
              const childHref = buildHref(child.href);
              const isChildActive = isItemActive(child.href);
              return (
                <li key={child.key}>
                  <Link
                    href={childHref}
                    aria-current={isChildActive ? "page" : undefined}
                    className={cn("sce-nav-child", isChildActive && "active")}
                  >
                    <span>{child.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <aside
      className={cn(
        "sce-sidebar flex-shrink-0 relative",
        isCollapsed && collapsedHydrated && "collapsed",
        isResizing && "sce-sidebar-resizing",
      )}
      aria-label="Hauptnavigation"
    >
      <div className="sce-sidebar-brand">
        <SidebarBrandHeader
          tenantName={displayClubName}
          logoUrl={isPlatformWorkspace ? null : logoUrl}
          collapsed={isCollapsed}
          platformWorkspace={isPlatformWorkspace}
        />

        <button
          type="button"
          onClick={handleToggle}
          aria-label={isCollapsed ? "Navigation ausklappen" : "Navigation einklappen"}
          aria-expanded={!isCollapsed}
          aria-controls="admin-sidebar-nav"
          className="sce-icon-button shrink-0 ml-auto min-h-[2.75rem] min-w-[2.75rem]"
        >
          {isCollapsed
            ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            : <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          }
        </button>
      </div>

      <nav
        id="admin-sidebar-nav"
        className="sce-sidebar-nav flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3"
        aria-label="Modulnavigation"
      >
        {sections.map((section, sectionIdx) => (
          <div
            key={section.sectionLabel ?? `nav-section:${sectionIdx}`}
            className={cn(sectionIdx > 0 && "mt-1.5")}
            role="group"
            aria-label={section.sectionLabel ?? undefined}
          >
            {section.sectionLabel && (
              <p className="sr-only">{section.sectionLabel}</p>
            )}
            {sectionIdx > 0 && (
              <div
                className="my-2 mx-1.5 border-t border-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                aria-hidden="true"
              />
            )}

            <ul className="sce-nav-module-list">
              {section.items.map((item) => renderModuleItem(item))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] px-2.5 py-3">
        <SidebarPlatformBrand collapsed={isCollapsed} />
      </div>

      {!isCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Seitenleiste vergrössern oder verkleinern"
          tabIndex={0}
          className="sce-sidebar-resize-handle hidden md:block"
          onMouseDown={onResizePointerDown}
          onKeyDown={onResizeKeyDown}
        />
      )}
    </aside>
  );
}
