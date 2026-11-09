"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** L1 primary header links. L2/L3 live in the portalled domain panel, not this primitive. */
export type SceNavigationLevel = "primary";

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
        level === "primary" &&
          "sce-global-primary-nav-item sce-global-primary-nav-domain shrink-0 inline-flex items-center",
        icon && "gap-1.5",
        isActive && "sce-global-primary-nav-item--active",
        !isActive && activeVisualClass,
        className,
      )}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span className="sce-global-primary-nav-domain-label">{label}</span>
    </Link>
  );
}
