import TenantLogo from "@/components/admin/branding/TenantLogo";
import { cn } from "@/lib/cn";

type HeaderTenantIdentityProps = {
  tenantName: string;
  logoUrl?: string | null;
  platformWorkspace?: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * Tenant-first identity for the global header. Structured for a future tenant
 * switcher (no fake menu until backend exists).
 */
export default function HeaderTenantIdentity({
  tenantName,
  logoUrl,
  platformWorkspace = false,
  compact = false,
  className,
}: HeaderTenantIdentityProps) {
  const displayName = platformWorkspace ? "SportClubEvo Platform" : tenantName;

  return (
    <div
      className={cn("flex min-w-0 items-center gap-2.5", className)}
      data-tenant-identity
    >
      {!platformWorkspace ? (
        <TenantLogo
          logoUrl={logoUrl}
          size={compact ? 32 : 36}
          alt={`${tenantName} Logo`}
        />
      ) : null}
      <p
        className={cn(
          "min-w-0 font-bold leading-snug tracking-[-0.01em] text-[var(--foreground)]",
          compact ? "max-w-[8rem] truncate text-sm" : "max-w-[14rem] truncate text-[0.9375rem]",
        )}
      >
        {displayName}
      </p>
    </div>
  );
}
