"use client";

import SidebarPlatformBrand from "@/components/admin/branding/SidebarPlatformBrand";
import HeaderTenantIdentity from "@/components/admin/layout/HeaderTenantIdentity";
import { cn } from "@/lib/cn";

type TenantContextProps = {
  displayClubName: string;
  logoUrl?: string | null;
  platformWorkspace: boolean;
  className?: string;
};

/**
 * Row 1 left rail — platform product identity only (desktop two-row composition).
 */
export function ScePlatformBrandRail({ className }: { className?: string }) {
  return (
    <div
      className={cn("sce-global-platform-brand-rail shrink-0 min-w-0 w-full", className)}
      data-testid="sce-platform-brand-rail"
    >
      <div className="hidden sm:block sce-global-sce-brand sce-global-sce-brand--wordmark">
        <SidebarPlatformBrand collapsed={false} className="!py-0 !px-0" />
      </div>
      <div className="sm:hidden sce-global-sce-brand sce-global-sce-brand--compact">
        <SidebarPlatformBrand collapsed className="!py-0 !px-0" />
      </div>
    </div>
  );
}

/**
 * Row 2 left rail — tenant crest + club name (desktop) or compact context (mobile stack).
 */
export function SceTenantContextRail({
  displayClubName,
  logoUrl,
  platformWorkspace,
  className,
  compact = false,
}: TenantContextProps & { compact?: boolean }) {
  if (platformWorkspace) {
    return (
      <p
        className={cn(
          "sce-global-tenant-context-name sce-global-tenant-context-name--platform m-0 min-w-0 truncate",
          className,
        )}
        data-testid="sce-tenant-context-rail"
      >
        SportClubEvo Platform
      </p>
    );
  }

  return (
    <HeaderTenantIdentity
      tenantName={displayClubName}
      logoUrl={logoUrl}
      platformWorkspace={false}
      layout={compact ? "under-product-compact" : "tenant-row-rail"}
      className={cn("sce-global-tenant-context-row sce-global-tenant-row-rail", className)}
    />
  );
}

type SceTenantIdentityBarProps = TenantContextProps;

/**
 * Mobile row-1 stack: product wordmark with tenant context beneath (not used on md+ desktop).
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
      <ScePlatformBrandRail />
      {platformWorkspace ? (
        <p className="sce-global-tenant-context-name sce-global-tenant-context-name--platform">
          SportClubEvo Platform
        </p>
      ) : (
        <>
          <SceTenantContextRail
            displayClubName={displayClubName}
            logoUrl={logoUrl}
            platformWorkspace={false}
            compact={false}
            className="hidden min-[480px]:flex"
          />
          <SceTenantContextRail
            displayClubName={displayClubName}
            logoUrl={logoUrl}
            platformWorkspace={false}
            compact
            className="min-[480px]:hidden flex"
          />
        </>
      )}
    </div>
  );
}
