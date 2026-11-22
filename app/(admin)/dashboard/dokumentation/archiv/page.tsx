import Link from "next/link";
import { redirect } from "next/navigation";
import { format, isValid } from "date-fns";
import { de } from "date-fns/locale";

import { TenantDocumentationArchivRestoreButton } from "@/components/admin/tenant-documentation/TenantDocumentationArchivRestoreButton";
import { TenantDocumentationUnauthorizedState } from "@/components/admin/tenant-documentation/TenantDocumentationUnauthorizedState";
import { TenantDocumentationWhiteSurface } from "@/components/admin/tenant-documentation/TenantDocumentationWhiteSurface";
import { PageShell } from "@/components/ui/page";
import {
  TENANT_DOCUMENTATION_LIST_PANEL_CLASS,
  TENANT_DOCUMENTATION_MANAGE_PAGE_CLASS,
  TENANT_DOCUMENTATION_MANAGE_ROUTE_ROOT_CLASS,
} from "@/lib/tenant-documentation/tenant-documentation-visual-styles";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listArchivedDocumentationPages } from "@/lib/tenant-documentation/page-lifecycle-service";
import {
  resolveTenantDocumentationActor,
} from "@/lib/tenant-documentation/authorization";
import { resolveTenantDocumentationHubRouteAccess } from "@/lib/tenant-documentation/route-access";
import { ensureDefaultSpace } from "@/lib/tenant-documentation/page-tree-service";

export default async function TenantDocumentationArchivPage() {
  const access = await resolveTenantDocumentationHubRouteAccess();

  if (access.kind === "unauthenticated") {
    redirect("/login");
  }

  if (access.kind === "forbidden" || access.kind === "no_tenant_context") {
    return (
      <PageShell fullWidth>
        <TenantDocumentationUnauthorizedState reason={access.kind} />
      </PageShell>
    );
  }

  if (!access.permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_MANAGE)) {
    return (
      <PageShell fullWidth>
        <TenantDocumentationUnauthorizedState reason="forbidden" />
      </PageShell>
    );
  }

  const tenant = await getActiveTenant();
  if (!tenant) {
    return (
      <PageShell fullWidth>
        <TenantDocumentationUnauthorizedState reason="no_tenant_context" />
      </PageShell>
    );
  }

  const space = await ensureDefaultSpace(tenant.id, access.actorUserId);
  const actor = await resolveTenantDocumentationActor({
    tenantId: tenant.id,
    userId: access.actorUserId,
    permissionKeys: access.permissionKeys,
  });

  const pages = await listArchivedDocumentationPages(actor, space.id);

  return (
    <PageShell fullWidth>
      <TenantDocumentationWhiteSurface>
        <div className={TENANT_DOCUMENTATION_MANAGE_ROUTE_ROOT_CLASS}>
        <div className={TENANT_DOCUMENTATION_MANAGE_PAGE_CLASS}>
        <nav className="mb-2 text-xs text-slate-600">
          <Link href="/dashboard/dokumentation" className="hover:underline">
            Dokumentation
          </Link>
          {" > Archiv"}
        </nav>
        <h1 className="mb-4 text-2xl font-semibold text-slate-900">Archiv</h1>
        {pages.length === 0 ? (
          <p className="text-sm text-slate-600">Keine archivierten Seiten.</p>
        ) : (
          <ul className={TENANT_DOCUMENTATION_LIST_PANEL_CLASS}>
            {pages.map((page) => (
              <li key={page.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{page.title}</p>
                  <p className="text-xs text-slate-600">
                    {page.spaceTitle}
                    {isValid(new Date(page.archivedAt))
                      ? ` · Archiviert am ${format(new Date(page.archivedAt), "d. MMM yyyy", { locale: de })}`
                      : ""}
                  </p>
                </div>
                <TenantDocumentationArchivRestoreButton pageId={page.id} />
              </li>
            ))}
          </ul>
        )}
        </div>
        </div>
      </TenantDocumentationWhiteSurface>
    </PageShell>
  );
}