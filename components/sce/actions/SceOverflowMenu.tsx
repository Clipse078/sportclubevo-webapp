"use client";

import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_OVERFLOW_MENU_ITEM_CLASS,
  SCE_OVERFLOW_MENU_ITEM_DESTRUCTIVE_CLASS,
  SCE_OVERFLOW_MENU_SURFACE_CLASS,
  SCE_OVERFLOW_MENU_TRIGGER_CLASS,
} from "@/lib/design-system/sce-action-dialog-micro-ux";
import { PopoverContent } from "@/components/ui/Popover";
import { SceIconButton } from "@/components/sce/actions/SceIconButton";
import type { SceFloatingLayer } from "@/lib/ui/sce-overlay-layering";

export type SceOverflowMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  triggerLabel: string;
  menuLabel: string;
  triggerIcon: ReactNode;
  children: ReactNode;
  className?: string;
  /** Use `composer` when the menu opens inside a modal sheet/dialog (above overlay z-index). */
  floatingLayer?: SceFloatingLayer;
};

export function SceOverflowMenu({
  open,
  onOpenChange,
  anchorRef,
  triggerLabel,
  menuLabel,
  triggerIcon,
  children,
  className,
  floatingLayer = "app",
}: SceOverflowMenuProps) {
  return (
    <>
      <SceIconButton
        ref={anchorRef}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        icon={triggerIcon}
        className={cn(SCE_OVERFLOW_MENU_TRIGGER_CLASS, "h-8 w-8")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(!open);
        }}
        data-sce-overflow-menu-trigger
      />
      <PopoverContent
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={anchorRef}
        placement="bottom-end"
        matchAnchorWidth={false}
        constrainHeight={false}
        clipOverflow={false}
        role="dialog"
        floatingLayer={floatingLayer}
        className={cn(SCE_OVERFLOW_MENU_SURFACE_CLASS, className)}
        data-sce-overflow-menu-surface
      >
        <div role="menu" aria-label={menuLabel}>
          {children}
        </div>
      </PopoverContent>
    </>
  );
}

export function SceOverflowMenuDivider() {
  return <div className="my-1 h-px bg-[var(--border)]/80" role="separator" />;
}

export type SceOverflowMenuItemProps = {
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
};

export function SceOverflowMenuItem({
  icon,
  iconClassName,
  label,
  href,
  onSelect,
  destructive = false,
}: SceOverflowMenuItemProps) {
  const className = destructive
    ? SCE_OVERFLOW_MENU_ITEM_DESTRUCTIVE_CLASS
    : SCE_OVERFLOW_MENU_ITEM_CLASS;

  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center",
          iconClassName,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} role="menuitem" className={className} onClick={onSelect}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={onSelect}>
      {content}
    </button>
  );
}
