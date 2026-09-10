import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import type { BillingStatusTone } from "@/lib/billing/billing-status-presentation";

type BillingStatusBadgeProps = {
  label: string;
  tone: BillingStatusTone;
};

export default function BillingStatusBadge({ label, tone }: BillingStatusBadgeProps) {
  const pillTone =
    tone === "success"
      ? "success"
      : tone === "warning"
        ? "warning"
        : tone === "muted"
          ? "muted"
          : "default";

  return <AdminStatusPill label={label} tone={pillTone} />;
}
