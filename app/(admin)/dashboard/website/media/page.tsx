import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import MediaLibraryDAM from "@/components/admin/media/MediaLibraryDAM";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function MediaLibraryPage() {
  await requireAnyPermission([PERMISSIONS.NEWS_MANAGE, PERMISSIONS.WEBSITE_MANAGE]);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Website"
        title="Medienbibliothek"
        description="Digitale Asset-Verwaltung — Bilder und Videos hochladen, organisieren und wiederverwenden."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Medien" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
      >
        <MediaLibraryDAM />
      </ListPagePattern>
    </PageShell>
  );
}
