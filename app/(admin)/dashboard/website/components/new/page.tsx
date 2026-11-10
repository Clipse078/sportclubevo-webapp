import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import ReusableComponentEditor from "@/components/admin/reusable-components/ReusableComponentEditor";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function NewReusableComponentPage() {
  await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Website"
        title="Neue Komponente"
        description="Wiederverwendbaren Inhalt erstellen und in Homepage, Seiten oder News einbinden."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Komponenten", href: "/dashboard/website/components" },
          { label: "Neu" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
      >
        <ReusableComponentEditor mode="create" />
      </FormPagePattern>
    </PageShell>
  );
}
