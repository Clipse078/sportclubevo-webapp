"use client";

import type { MouseEvent, RefObject } from "react";
import { useLayoutEffect, useState } from "react";
import type { NavItemChild } from "@/lib/nav/nav-config";
import { cn } from "@/lib/cn";
import Link from "next/link";

export type SceContextNavigationPanelProps = {
  panelId: string;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  title: string;
  items: NavItemChild[];
  resolveHref: (href: string) => string;
  isItemActive: (child: NavItemChild) => boolean;
  onNavigateSibling: (event: MouseEvent<HTMLAnchorElement>, child: NavItemChild) => void;
  onClose: () => void;
  className?: string;
};

type PanelPosition = {
  top: number;
  left: number;
  maxWidth: number;
};

function computePanelPosition(anchor: HTMLElement): PanelPosition {
  const rect = anchor.getBoundingClientRect();
  const viewportPadding = 12;
  const maxWidth = Math.min(20 * 16, window.innerWidth - viewportPadding * 2);
  let left = rect.left;
  if (left + maxWidth > window.innerWidth - viewportPadding) {
    left = Math.max(viewportPadding, window.innerWidth - viewportPadding - maxWidth);
  }
  return {
    top: rect.bottom + 4,
    left,
    maxWidth,
  };
}

export function SceContextNavigationPanel({
  panelId,
  open,
  anchorRef,
  title,
  items,
  resolveHref,
  isItemActive,
  onNavigateSibling,
  onClose,
  className,
}: SceContextNavigationPanelProps) {
  const [position, setPosition] = useState<PanelPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const anchor = anchorRef.current;
    if (!anchor) return;

    const update = () => {
      setPosition(computePanelPosition(anchor));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, items.length]);

  if (!open || items.length === 0 || !position) {
    return null;
  }

  return (
    <div
      id={panelId}
      role="navigation"
      aria-label={title}
      data-testid="sce-context-nav-panel"
      className={cn("sce-context-nav-panel", className)}
      style={{
        top: position.top,
        left: position.left,
        maxWidth: position.maxWidth,
      }}
    >
      <p className="sce-context-nav-panel-heading">{title}</p>
      <ul className="sce-context-nav-panel-list">
        {items.map((child) => {
          const active = isItemActive(child);
          return (
            <li key={child.key}>
              <Link
                href={resolveHref(child.href)}
                className={cn(
                  "sce-context-nav-panel-link",
                  active && "sce-context-nav-panel-link--active",
                )}
                aria-current={active ? "page" : undefined}
                data-nav-context-destination={child.key}
                onClick={(event) => {
                  onNavigateSibling(event, child);
                  onClose();
                }}
              >
                {child.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
