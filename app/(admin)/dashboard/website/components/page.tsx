import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import ReusableComponentsLibrary from "@/components/admin/reusable-components/ReusableComponentsLibrary";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function ReusableComponentsPage() {
  await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Website"
        title="Wiederverwendbare Inhalte"
        description="Komponenten einmal erstellen — in Homepage, Seiten, News und weiteren Modulen referenzieren."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Komponenten" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
      >
        <ReusableComponentsLibrary />
      </ListPagePattern>
    </PageShell>
  );
}
