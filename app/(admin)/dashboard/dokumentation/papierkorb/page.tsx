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
} from "@/lib/tenant-documentation/tenant-documentation-visual-styles";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listTrashedDocumentationPages } from "@/lib/tenant-documentation/page-lifecycle-service";
import { resolveTenantDocumentationActor } from "@/lib/tenant-documentation/authorization";
import { resolveTenantDocumentationHubRouteAccess } from "@/lib/tenant-documentation/route-access";
import { ensureDefaultSpace } from "@/lib/tenant-documentation/page-tree-service";
import { tenantDocumentationPagePath } from "@/lib/tenant-documentation/sce-tenant-documentation-handoff";

export default async function TenantDocumentationPapierkorbPage() {
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

  const pages = await listTrashedDocumentationPages(actor, space.id);

  return (
    <PageShell fullWidth>
      <TenantDocumentationWhiteSurface>
        <div className={TENANT_DOCUMENTATION_MANAGE_PAGE_CLASS}>
        <nav className="mb-2 text-xs text-[var(--sce-color-text-muted)]">
          <Link href="/dashboard/dokumentation" className="hover:underline">
            Dokumentation
          </Link>
          {" > Papierkorb"}
        </nav>
        <h1 className="mb-4 text-2xl font-semibold text-[var(--sce-color-text-primary)]">Papierkorb</h1>
        {pages.length === 0 ? (
          <p className="text-sm text-[var(--sce-color-text-muted)]">Keine Seiten im Papierkorb.</p>
        ) : (
          <ul className={TENANT_DOCUMENTATION_LIST_PANEL_CLASS}>
            {pages.map((page) => (
              <li key={page.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link
                    href={tenantDocumentationPagePath(page.id)}
                    className="font-medium text-[var(--sce-color-text-primary)] hover:underline"
                  >
                    {page.title}
                  </Link>
                  <p className="text-xs text-[var(--sce-color-text-muted)]">
                    {page.spaceTitle}
                    {isValid(new Date(page.trashedAt))
                      ? ` · Gelöscht am ${format(new Date(page.trashedAt), "d. MMM yyyy", { locale: de })}`
                      : ""}
                  </p>
                </div>
                <TenantDocumentationArchivRestoreButton pageId={page.id} source="trash" />
              </li>
            ))}
          </ul>
        )}
        </div>
      </TenantDocumentationWhiteSurface>
    </PageShell>
  );
}