import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import WebsiteSettingsForm from "@/components/admin/website/WebsiteSettingsForm";
import { PageShell, SectionCard } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function WebsiteSettingsPage() {
  await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);

  const ctx = await getActiveTenant();
  if (!ctx) notFound();

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Website"
        title="Einstellungen"
        description="Website-Veröffentlichung und Vier-Augen-Prinzip konfigurieren."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Einstellungen" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
      >
        <SectionCard>
          <WebsiteSettingsForm
            defaultValues={{ approvedDataOnly: ctx.approvedDataOnly }}
          />
        </SectionCard>
      </ListPagePattern>
    </PageShell>
  );
}
