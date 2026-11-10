/**
 * /dashboard/website/pages/[id]/builder
 *
 * Admin Page Builder for a specific website page (CMS V2 Slice 8).
 *
 * Allows tenant admins to compose a page from CMS blocks using the shared
 * block registry. This is a foundation-level builder:
 *   - No visual drag-and-drop
 *   - No live visual preview
 *   - No section-level publishing workflow (sections inherit page publish state)
 *
 * Permission: WEBSITE_MANAGE
 * Tenant isolation: from session
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, PenLine } from "lucide-react";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getWebsitePageAdminById } from "@/lib/pages/admin-queries";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";
import WebsitePageStatusBadge from "@/components/admin/pages/WebsitePageStatusBadge";
import PageBuilderClient from "@/components/admin/page-builder/PageBuilderClient";

export default async function PageBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);

  const ctx = await getActiveTenant();
  if (!ctx) notFound();

  const { id } = await params;
  const page = await getWebsitePageAdminById(ctx.id, id);
  if (!page) notFound();

  const editHref = `/dashboard/website/pages/${id}/edit`;

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Website"
        title={page.title}
        description={`Seiten-Slug: /${page.slug}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Seiten", href: "/dashboard/website/pages" },
          { label: page.title, href: editHref },
          { label: "Page Builder" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
        headerBadge={<WebsitePageStatusBadge status={page.status} />}
        headerActions={
          <>
            <Link href={editHref} className="fca-button-secondary">
              <PenLine className="h-4 w-4" />
              Seite bearbeiten
            </Link>
            <Link
              href="/dashboard/website/pages"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Alle Seiten
            </Link>
          </>
        }
      >
        <PageBuilderClient
          pageId={id}
          pageTitle={page.title}
          pageSlug={page.slug}
        />
      </DetailPagePattern>
    </PageShell>
  );
}
