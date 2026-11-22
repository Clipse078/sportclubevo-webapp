import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { TENANT_DOCUMENTATION_WHITE_SURFACE_ATTR } from "@/lib/tenant-documentation/tenant-documentation-visual-styles";

/**
 * Forces DS2 white-edition tokens for Dokumentation routes so the document canvas
 * stays readable even when `SCE_WHITE_EDITION` is off globally (default dark navy tokens).
 */
export function TenantDocumentationWhiteSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      {...TENANT_DOCUMENTATION_WHITE_SURFACE_ATTR}
      className={cn(TENANT_DOCUMENTATION_WHITE_SURFACE_ATTR.className, "min-w-0", className)}
      data-testid="tenant-documentation-white-surface"
    >
      {children}
    </div>
  );
}