"use client";

import { SceIcon } from "@/components/design-system/icons/SceIcon";
import type { SceIconSize } from "@/components/design-system/icons/SceIcon.types";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { cn } from "@/lib/cn";

type ProductDomainSceIconProps = {
  name: SceIconRegistryName;
  size?: SceIconSize;
  className?: string;
  title?: string;
};

/** Decorative domain semantic icon — pair with visible text unless `title` is set. */
export function ProductDomainSceIcon({
  name,
  size = 20,
  className,
  title,
}: ProductDomainSceIconProps) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      aria-hidden={title ? undefined : true}
      data-sce-product-domain-icon={name}
    >
      <SceIcon name={name} size={size} title={title} />
    </span>
  );
}
