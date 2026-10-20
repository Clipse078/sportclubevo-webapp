import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_DENSE_META_TEXT_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";

export type SceEntityIdentityProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  leading?: ReactNode;
  badges?: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * Entity-oriented row identity — optional avatar/crest, primary title, secondary context.
 */
export function SceEntityIdentity({
  primary,
  secondary,
  leading,
  badges,
  className,
  "data-testid": testId = "sce-entity-identity",
}: SceEntityIdentityProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)} data-testid={testId}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-semibold leading-snug text-[var(--foreground)]">
            {primary}
          </span>
          {badges}
        </div>
        {secondary ? (
          <p className={cn("mt-0.5 truncate", SCE_DENSE_META_TEXT_CLASS)}>{secondary}</p>
        ) : null}
      </div>
    </div>
  );
}
