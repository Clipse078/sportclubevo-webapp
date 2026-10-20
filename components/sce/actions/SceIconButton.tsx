"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button, type ButtonSize } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { SCE_ICON_BUTTON_TOUCH_TARGET_CLASS } from "@/lib/design-system/sce-responsive-accessibility-micro-ux";

export type SceIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Required accessible name — icon-only actions must not rely on recognition alone. */
  "aria-label": string;
  icon: ReactNode;
  size?: Extract<ButtonSize, "sm" | "default" | "icon">;
  variant?: "ghost" | "secondary";
};

/**
 * Canonical icon-only action — wraps Button size=icon with required aria-label.
 */
export const SceIconButton = forwardRef<HTMLButtonElement, SceIconButtonProps>(
  ({ icon, className, size = "icon", variant = "ghost", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size === "default" ? "icon" : size}
        className={cn(SCE_ICON_BUTTON_TOUCH_TARGET_CLASS, className)}
        data-sce-icon-action
        {...props}
      >
        <span className="inline-flex shrink-0 items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      </Button>
    );
  },
);

SceIconButton.displayName = "SceIconButton";
