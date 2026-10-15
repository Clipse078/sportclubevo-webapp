"use client";

import SidebarPlatformBrand from "@/components/admin/branding/SidebarPlatformBrand";
import HeaderTenantIdentity from "@/components/admin/layout/HeaderTenantIdentity";

type SceTenantIdentityBarProps = {
  displayClubName: string;
  logoUrl?: string | null;
  platformWorkspace: boolean;
};

export function SceTenantIdentityBar({
  displayClubName,
  logoUrl,
  platformWorkspace,
}: SceTenantIdentityBarProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 md:gap-3" data-testid="sce-tenant-identity-bar">
      <div className="hidden sm:block sce-global-sce-brand sce-global-sce-brand--wordmark">
        <SidebarPlatformBrand collapsed={false} className="!py-0 !px-0" />
      </div>
      <div className="sm:hidden sce-global-sce-brand sce-global-sce-brand--compact">
        <SidebarPlatformBrand collapsed className="!py-0 !px-0" />
      </div>

      <span
        className="hidden md:block h-5 w-px bg-[color-mix(in_srgb,var(--border)_70%,transparent)]"
        aria-hidden="true"
        data-testid="sce-product-tenant-separator"
      />

      <HeaderTenantIdentity
        tenantName={displayClubName}
        logoUrl={platformWorkspace ? null : logoUrl}
        platformWorkspace={platformWorkspace}
        compact={false}
        className="hidden min-[480px]:flex"
      />
      <HeaderTenantIdentity
        tenantName={displayClubName}
        logoUrl={platformWorkspace ? null : logoUrl}
        platformWorkspace={platformWorkspace}
        compact
        className="min-[480px]:hidden flex"
      />
    </div>
  );
}
