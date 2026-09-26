"use client";

import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import type { SceIconSize } from "@/components/design-system/icons/SceIcon.types";
import { getOrgUnitTypeSceIconName } from "@/lib/icons/org-unit-type-sce-icons";

type OrgUnitTypeSceIconProps = {
  type: string;
  size?: SceIconSize;
  className?: string;
};

export function OrgUnitTypeSceIcon({ type, size = 20, className }: OrgUnitTypeSceIconProps) {
  return (
    <ProductDomainSceIcon
      name={getOrgUnitTypeSceIconName(type)}
      size={size}
      className={className}
    />
  );
}
