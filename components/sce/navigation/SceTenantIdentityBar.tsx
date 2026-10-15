"use client";

import SidebarPlatformBrand from "@/components/admin/branding/SidebarPlatformBrand";
import HeaderTenantIdentity from "@/components/admin/layout/HeaderTenantIdentity";
import { cn } from "@/lib/cn";

type SceTenantIdentityBarProps = {
  displayClubName: string;
  logoUrl?: string | null;
  platformWorkspace: boolean;
};

/**
 * Product identity stacked above active club/tenant context (FM26-style club workspace rail).
 * SportClubEvo = product; crest + club name = subordinate tenant row — never horizontal "SCE | Club".
 */
export function SceTenantIdentityBar({
  displayClubName,
  logoUrl,
  platformWorkspace,
}: SceTenantIdentityBarProps) {
  return (
    <div
      className={cn(
        "sce-global-brand-tenant-stack shrink-0",
        platformWorkspace && "sce-global-brand-tenant-stack--platform",
      )}
      data-testid="sce-tenant-identity-bar"
      data-tenant-under-sce={platformWorkspace ? "false" : "true"}
    >
      <div className="sce-global-brand-product-row">
        <div className="hidden sm:block sce-global-sce-brand sce-global-sce-brand--wordmark">
          <SidebarPlatformBrand collapsed={false} className="!py-0 !px-0" />
        </div>
        <div className="sm:hidden sce-global-sce-brand sce-global-sce-brand--compact">
          <SidebarPlatformBrand collapsed className="!py-0 !px-0" />
        </div>
      </div>

      {platformWorkspace ? (
        <p className="sce-global-tenant-context-name sce-global-tenant-context-name--platform">
          SportClubEvo Platform
        </p>
      ) : (
        <>
          <HeaderTenantIdentity
            tenantName={displayClubName}
            logoUrl={logoUrl}
            platformWorkspace={false}
            layout="under-product"
            className="hidden min-[480px]:flex sce-global-tenant-context-row"
          />
          <HeaderTenantIdentity
            tenantName={displayClubName}
            logoUrl={logoUrl}
            platformWorkspace={false}
            layout="under-product-compact"
            className="min-[480px]:hidden flex sce-global-tenant-context-row"
          />
        </>
      )}
    </div>
  );
}
