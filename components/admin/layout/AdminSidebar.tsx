"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SidebarBrandHeader from "@/components/admin/branding/SidebarBrandHeader";
import SidebarPlatformBrand from "@/components/admin/branding/SidebarPlatformBrand";
import { AnimatedNavIcon } from "@/components/ui/motion/AnimatedNavIcon";
import { useSidebarResize } from "@/hooks/useSidebarResize";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import type { NavSection } from "@/lib/nav/nav-config";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { cn } from "@/lib/cn";

type AdminSidebarProps = {
  permissionKeys: string[];
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

export default function AdminSidebar({
  permissionKeys,
  clubName,
  logoUrl,
  collapsed,
  onToggle,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSeason = searchParams.get("season");

  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed =
    typeof collapsed === "boolean" ? collapsed : internalCollapsed;

  const handleToggle =
    typeof onToggle === "function"
      ? onToggle
      : () => setInternalCollapsed((c) => !c);

  const { isResizing, onResizePointerDown, onResizeKeyDown } = useSidebarResize({
    collapsed: isCollapsed,
  });

  const sections: NavSection[] = getVisibleNavSections(
    permissionKeys as PermissionKey[],
  );

  const displayClubName = clubName ?? "SportClubEvo";

  function buildHref(baseHref: string) {
    if (!selectedSeason || !shouldCarrySeason(baseHref)) return baseHref;
    return `${baseHref}?season=${encodeURIComponent(selectedSeason)}`;
  }

  function isItemActive(href: string): boolean {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  }

  return (
    <aside
      className={cn(
        "sce-sidebar flex-shrink-0 relative",
        isCollapsed && "collapsed",
        isResizing && "sce-sidebar-resizing",
      )}
      aria-label="Hauptnavigation"
    >
      <div className="sce-sidebar-brand">
        <SidebarBrandHeader
          tenantName={displayClubName}
          logoUrl={logoUrl}
          collapsed={isCollapsed}
        />

        <button
          type="button"
          onClick={handleToggle}
          aria-label={isCollapsed ? "Menü erweitern" : "Menü einklappen"}
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
            className={cn(sectionIdx > 0 && "mt-5")}
            role="group"
            aria-label={section.sectionLabel ?? undefined}
          >
            {section.sectionLabel && !isCollapsed && (
              <p
                className={cn(
                  "sce-nav-section-label",
                  sectionIdx > 0 && "mt-0",
                )}
              >
                {section.sectionLabel}
              </p>
            )}
            {section.sectionLabel && isCollapsed && sectionIdx > 0 && (
              <div
                className="my-2.5 mx-1.5 border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)]"
                aria-hidden="true"
              />
            )}

            <ul className="space-y-1">
              {section.items.map((item) => {
                const resolvedHref = buildHref(item.href);
                const childActive = item.children?.some((c) => isItemActive(c.href)) ?? false;
                const isActive = isItemActive(item.href) || childActive;

                return (
                  <li key={item.key}>
                    <Link
                      href={resolvedHref}
                      title={isCollapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "sce-nav-item",
                        isActive && "active",
                        isCollapsed && "justify-center px-2",
                      )}
                    >
                      <span className="sce-nav-icon-wrap" aria-hidden={false}>
                        <AnimatedNavIcon
                          label={item.label}
                          active={isActive}
                          variant="parent"
                        />
                      </span>
                      <span className={cn(isCollapsed && "sr-only")}>{item.label}</span>
                    </Link>

                    {!isCollapsed && item.children && item.children.length > 0 && (
                      <ul className="mt-1 space-y-0.5 border-l border-[color-mix(in_srgb,var(--border)_55%,transparent)] ml-[1.125rem] pl-2">
                        {item.children.map((child) => {
                          const childHref = buildHref(child.href);
                          const isChildActive = isItemActive(child.href);
                          return (
                            <li key={child.key}>
                              <Link
                                href={childHref}
                                aria-current={isChildActive ? "page" : undefined}
                                className={cn("sce-nav-child", isChildActive && "active")}
                              >
                                <span className="sce-nav-icon-wrap sce-nav-icon-wrap--child" aria-hidden={false}>
                                  <AnimatedNavIcon
                                    label={child.label}
                                    active={isChildActive}
                                    variant="child"
                                  />
                                </span>
                                <span>{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
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
