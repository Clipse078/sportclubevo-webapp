"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SceNavigationLevel = "primary" | "module" | "context";

const LEVEL_CLASS: Record<SceNavigationLevel, string> = {
  primary: "sce-global-primary-nav-item",
  module: "sce-global-module-nav-item",
  context: "sce-global-context-nav-item",
};

const LEVEL_ACTIVE_CLASS: Record<SceNavigationLevel, string> = {
  primary: "sce-global-primary-nav-item--active",
  module: "sce-global-module-nav-item--active",
  context: "sce-global-context-nav-item--active",
};

export type SceNavigationItemProps = {
  level: SceNavigationLevel;
  href: string;
  label: ReactNode;
  isActive?: boolean;
  /** Optional override when route context uses a non-strong active treatment. */
  activeVisualClass?: string;
  icon?: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  "data-testid"?: string;
  "data-nav-domain"?: string;
  "data-nav-destination"?: string;
};

export function SceNavigationItem({
  level,
  href,
  label,
  isActive = false,
  activeVisualClass,
  icon,
  className,
  onClick,
  "data-testid": dataTestId,
  "data-nav-domain": dataNavDomain,
  "data-nav-destination": dataNavDestination,
}: SceNavigationItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      data-testid={dataTestId}
      data-nav-domain={dataNavDomain}
      data-nav-destination={dataNavDestination}
      onClick={onClick}
      className={cn(
        LEVEL_CLASS[level],
        level === "primary" && "sce-global-primary-nav-domain shrink-0 inline-flex items-center",
        level !== "primary" && icon && "inline-flex items-center gap-1.5",
        isActive && LEVEL_ACTIVE_CLASS[level],
        !isActive && activeVisualClass,
        className,
      )}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span className={level === "primary" ? "sce-global-primary-nav-domain-label" : undefined}>
        {label}
      </span>
    </Link>
  );
}
