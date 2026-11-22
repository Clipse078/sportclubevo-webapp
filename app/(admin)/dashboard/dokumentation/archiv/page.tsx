import Link from "next/link";
import { redirect } from "next/navigation";
import { format, isValid } from "date-fns";
import { de } from "date-fns/locale";

import { TenantDocumentationArchivRestoreButton } from "@/components/admin/tenant-documentation/TenantDocumentationArchivRestoreButton";
import { TenantDocumentationUnauthorizedState } from "@/components/admin/tenant-documentation/TenantDocumentationUnauthorizedState";
import { PageShell } from "@/components/ui/page";
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
      <div className="mx-auto max-w-3xl px-4 py-6">
        <nav className="mb-2 text-xs text-[var(--muted)]">
          <Link href="/dashboard/dokumentation" className="hover:underline">
            Dokumentation
          </Link>
          {" > Archiv"}
        </nav>
        <h1 className="mb-4 text-2xl font-semibold text-[var(--foreground)]">Archiv</h1>
        {pages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Keine archivierten Seiten.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
            {pages.map((page) => (
              <li key={page.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{page.title}</p>
                  <p className="text-xs text-[var(--muted)]">
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
    </PageShell>
  );
}