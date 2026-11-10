import type { BreadcrumbItem } from "@/components/ui/page";

const BILLING_ROOT = "/dashboard/admin/commercial/billing";

/** Finance-style trail for the commercial billing workspace. */
export function billingWorkspaceBreadcrumbs(current?: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Admin", href: "/dashboard/admin" },
    {
      label: "Abrechnung",
      href: current ? BILLING_ROOT : undefined,
    },
  ];
  if (current) {
    crumbs.push({ label: current });
  }
  return crumbs;
}
