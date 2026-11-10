import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { CMS_ROUTES } from "@/lib/cms/routes";
import { HomepageBuilderWorkspace } from "@/components/admin/homepage-builder";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function HomepageBuilderPage() {
  await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Website"
        title="Homepage Builder"
        description="Visueller Block-Editor für Homepage-Sektionen. Aktivierte und veröffentlichte Sektionen erscheinen in der öffentlichen API."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: CMS_ROUTES.overview },
          { label: "Homepage Builder" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
      >
        <HomepageBuilderWorkspace />
      </ListPagePattern>
    </PageShell>
  );
}
