import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PUBLISHING_READ_PERMISSIONS } from "@/lib/permissions/content-view-permissions";
import { sessionCanWriteNews, sessionCanWriteWebsite } from "@/lib/permissions/content-view-access";
import PublishingCenter from "@/components/admin/publishing/PublishingCenter";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function PublishingCenterPage() {
  const session = await requireAnyPermission([...PUBLISHING_READ_PERMISSIONS]);
  const readOnly = !sessionCanWriteNews(session) && !sessionCanWriteWebsite(session);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Website"
        title="Veröffentlichungen"
        description={
          readOnly
            ? "Veröffentlichte Inhalte einsehen (read-only)."
            : "Inhalte prüfen, freigeben, planen und veröffentlichen."
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Veröffentlichungen" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
        headerActions={
          !readOnly ? (
            <>
              <Link href="/dashboard/website/news/new" className="fca-button-secondary">
                <Plus className="h-4 w-4" />
                Neue News
              </Link>
              <Link href="/dashboard/website/pages/new" className="fca-button-primary">
                <Plus className="h-4 w-4" />
                Neue Seite
              </Link>
            </>
          ) : undefined
        }
      >
        <PublishingCenter readOnly={readOnly} />
      </ListPagePattern>
    </PageShell>
  );
}
