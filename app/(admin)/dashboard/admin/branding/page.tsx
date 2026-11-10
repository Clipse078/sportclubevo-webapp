import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import BrandingSettingsForm from "@/components/admin/branding/BrandingSettingsForm";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

// Branding management for the authenticated user's own tenant.
// Tenant resolved through the single tenant-context helper (RPERM-04) — no URL slug required.
// Permission: USERS_MANAGE (club admin level) — no TENANTS_MANAGE needed.

export default async function BrandingPage() {
  await requireAnyPermission([PERMISSIONS.USERS_MANAGE]);
  const ctx = await getActiveTenant();
  if (!ctx) notFound();

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Admin"
        title="Darstellung"
        description="Logo und Vereinsfarben konfigurieren. Änderungen wirken sich sofort auf die Seitenleiste, das Dashboard und alle Branding-Oberflächen aus."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Darstellung" },
        ]}
      >
      <BrandingSettingsForm
        tenantName={ctx.name}
        defaultValues={{
          logoUrl: ctx.logoUrl,
          primaryColor: ctx.primaryColor,
          secondaryColor: ctx.secondaryColor,
        }}
      />
      </FormPagePattern>
    </PageShell>
  );
}
