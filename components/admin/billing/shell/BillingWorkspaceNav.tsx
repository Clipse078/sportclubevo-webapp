"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BILLING_WORKSPACE_ADMIN_NAV,
  BILLING_WORKSPACE_PRIMARY_NAV,
  billingNavItemIsActive,
} from "@/lib/nav/billing-workspace-nav";
import { cn } from "@/lib/cn";

type Props = {
  showOperations?: boolean;
};

export default function BillingWorkspaceNav({ showOperations = true }: Props) {
  const pathname = usePathname();

  const adminItems = showOperations
    ? BILLING_WORKSPACE_ADMIN_NAV
    : BILLING_WORKSPACE_ADMIN_NAV.filter((item) => item.key !== "operations");

  return (
    <nav
      className="flex flex-col gap-3 border-b border-[color-mix(in_srgb,var(--border)_50%,transparent)] pb-4"
      aria-label="Abrechnung Navigation"
    >
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Abrechnung Bereiche">
        {BILLING_WORKSPACE_PRIMARY_NAV.map((item) => {
          const active = billingNavItemIsActive(pathname, item);
          return (
            <Link
              key={item.key}
              href={item.href}
              role="tab"
              aria-selected={active}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
                active
                  ? "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div
        className="flex flex-wrap items-center gap-1 pt-1 border-t border-[color-mix(in_srgb,var(--border)_35%,transparent)]"
        aria-label="Abrechnung Administration"
      >
        <span className="sr-only">Administration</span>
        {adminItems.map((item) => {
          const active = billingNavItemIsActive(pathname, item);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
                active
                  ? "text-[var(--foreground)] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
                  : "text-[var(--muted)] hover:text-[var(--text-2)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
