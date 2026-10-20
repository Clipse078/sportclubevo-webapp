import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5",
    "whitespace-nowrap font-semibold",
    "sce-btn-motion",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sce-color-app-background)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "shrink-0 select-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "rounded-[var(--sce-radius-control)] border border-transparent",
          "bg-[var(--sce-color-accent-primary)] text-white",
          "hover:bg-[var(--sce-color-accent-hover)]",
          "focus-visible:ring-[var(--sce-color-focus)]",
        ],
        secondary: [
          "rounded-[var(--sce-radius-control)] border border-[var(--sce-color-border-strong)]",
          "bg-[var(--sce-color-surface-standard)] text-[var(--sce-color-text-secondary)]",
          "hover:bg-[var(--sce-color-surface-hover)] hover:text-[var(--sce-color-text-primary)]",
          "focus-visible:ring-[var(--sce-color-border-strong)]",
        ],
        ghost: [
          "rounded-[var(--sce-radius-control)] border border-transparent",
          "bg-transparent text-[var(--sce-color-text-secondary)]",
          "hover:bg-[var(--sce-color-surface-hover)] hover:text-[var(--sce-color-text-primary)]",
          "focus-visible:ring-[var(--sce-color-border-standard)]",
        ],
        danger: [
          "rounded-[var(--sce-radius-control)] border border-transparent",
          "bg-[var(--sce-color-status-error)] text-white",
          "hover:bg-[var(--sce-danger-hover)]",
          "focus-visible:ring-[var(--sce-color-status-error)]",
        ],
        link: [
          "border-none rounded-none bg-transparent",
          "text-[var(--sce-color-accent-primary)]",
          "underline-offset-4 hover:underline",
          "focus-visible:ring-[var(--sce-color-focus)]",
        ],
      },
      size: {
        sm:      "h-7 px-3 text-xs rounded-md",
        default: "h-9 px-3.5 text-sm",
        lg:      "h-10 px-5 text-sm",
        icon:    "h-9 w-9 p-0 rounded-lg",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        size: ["sm", "default", "lg", "icon"],
        className: "h-auto px-0 py-0",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size:    "default",
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize    = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Show a loading spinner and disable interaction. */
    loading?: boolean;
    /** Icon rendered to the left of the label. */
    iconLeft?: ReactNode;
    /** Icon rendered to the right of the label. */
    iconRight?: ReactNode;
  };

/**
 * Button
 *
 * SportClubEvo Design System primitive.
 * Built with class-variance-authority — use `variant` and `size` props.
 * Supports loading state, icon slots, and all HTML button attributes.
 *
 * Usage:
 *   <Button variant="primary" size="default">Save</Button>
 *   <Button variant="secondary" iconLeft={<Plus />}>Add Team</Button>
 *   <Button variant="danger" loading>Deleting…</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      disabled,
      iconLeft,
      iconRight,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          iconLeft && (
            <span className="inline-flex shrink-0" aria-hidden="true">
              {iconLeft}
            </span>
          )
        )}

        {children}

        {!loading && iconRight && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
