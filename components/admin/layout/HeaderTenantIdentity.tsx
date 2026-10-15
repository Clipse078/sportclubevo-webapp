import TenantLogo from "@/components/admin/branding/TenantLogo";
import { cn } from "@/lib/cn";

type HeaderTenantIdentityProps = {
  tenantName: string;
  logoUrl?: string | null;
  platformWorkspace?: boolean;
  /** @deprecated use layout */
  compact?: boolean;
  layout?: "inline" | "under-product" | "under-product-compact";
  className?: string;
};

const CREST_SIZE: Record<NonNullable<HeaderTenantIdentityProps["layout"]>, number> = {
  inline: 36,
  "under-product": 26,
  "under-product-compact": 22,
};

/**
 * Tenant identity for the global header. Under-product layout keeps club context
 * subordinate to the SportClubEvo product wordmark (stacked brand rail).
 */
export default function HeaderTenantIdentity({
  tenantName,
  logoUrl,
  platformWorkspace = false,
  compact = false,
  layout,
  className,
}: HeaderTenantIdentityProps) {
  const resolvedLayout =
    layout ?? (compact ? "under-product-compact" : "inline");
  const displayName = platformWorkspace ? "SportClubEvo Platform" : tenantName;
  const crestSize = CREST_SIZE[resolvedLayout];
  const isStacked =
    resolvedLayout === "under-product" || resolvedLayout === "under-product-compact";

  if (platformWorkspace) {
    return (
      <div className={cn("flex min-w-0 items-center gap-2.5", className)} data-tenant-identity>
        <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-2)]">{displayName}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        isStacked ? "gap-2 sce-global-tenant-context-inner" : "gap-2.5",
        className,
      )}
      data-tenant-identity
      data-tenant-layout={resolvedLayout}
    >
      <TenantLogo
        logoUrl={logoUrl}
        size={crestSize}
        alt={`${tenantName} Logo`}
        variant="header-crest"
        displayName={tenantName}
      />
      <p
        className={cn(
          "min-w-0 font-semibold leading-tight tracking-[-0.01em] text-[var(--text-2)]",
          isStacked
            ? resolvedLayout === "under-product-compact"
              ? "max-w-[9rem] truncate text-xs"
              : "max-w-[12rem] truncate text-[0.8125rem]"
            : compact
              ? "max-w-[8rem] truncate text-sm"
              : "max-w-[14rem] truncate text-[0.9375rem] font-bold text-[var(--foreground)]",
        )}
      >
        {displayName}
      </p>
    </div>
  );
}
