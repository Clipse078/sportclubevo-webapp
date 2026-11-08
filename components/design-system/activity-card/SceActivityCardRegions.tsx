"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_ACTIVITY_CARD_SHELL_CLASS,
  SCE_ACTIVITY_CARD_SHELL_INTERACTIVE_CLASS,
  type SceActivityCardCategory,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-shell-contract";
import { sceActivityCardRegionClass } from "@/lib/design-system/sce-activity-card-layout-contract";

export type SceActivityCardShellProps = {
  category: SceActivityCardCategory;
  children: ReactNode;
  interactive?: boolean;
  className?: string;
  testId?: string;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">;

export function SceActivityCardShell({
  category,
  children,
  interactive = false,
  className,
  testId = "sce-activity-card-shell",
  ...rest
}: SceActivityCardShellProps) {
  return (
    <div
      {...rest}
      className={cn(
        SCE_ACTIVITY_CARD_SHELL_CLASS,
        interactive && SCE_ACTIVITY_CARD_SHELL_INTERACTIVE_CLASS,
        className,
      )}
      data-testid={testId}
      data-sce-activity-card
      data-sce-activity-category={category}
    >
      {children}
    </div>
  );
}

type RegionProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">;

export function SceActivityCardHeader({ children, className, testId, ...rest }: RegionProps) {
  return (
    <div
      {...rest}
      className={sceActivityCardRegionClass("header", className)}
      data-sce-activity-card-region="header"
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function SceActivityCardBody({ children, className, testId, ...rest }: RegionProps) {
  return (
    <div
      {...rest}
      className={sceActivityCardRegionClass("body", className)}
      data-sce-activity-card-region="body"
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function SceActivityCardFooter({ children, className, testId, ...rest }: RegionProps) {
  return (
    <div
      {...rest}
      className={sceActivityCardRegionClass("footer", className)}
      data-sce-activity-card-region="footer"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
