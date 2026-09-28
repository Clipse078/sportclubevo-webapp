import Link from "next/link";
import { Suspense } from "react";
import { FileStack } from "lucide-react";
import { notFound } from "next/navigation";
import VorlagenListToolbar from "@/components/admin/communication/vorlagen/VorlagenListToolbar";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { EmptyState, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import {
  PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS,
  tenantPermissionsIncludePlatformTemplateView,
} from "@/lib/communication/templates/route-access";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";
import { listVorlagenForManagement } from "@/lib/communication/templates/template-management-service";
import {
  formatVorlagenListTimestamp,
  vorlageKindLabel,
  vorlageStatusLabel,
  vorlageStatusTone,
  VORLAGEN_OVERVIEW_DESCRIPTION,
} from "@/lib/communication/templates/vorlagen-display";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ q?: string; kind?: string }>;
};

export default async function CommunicationTemplatesPage(props: PageProps = {}) {
  const session = await requireAnyPermission(PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const params = (await props.searchParams) ?? {};
  const kindParam = params.kind ?? "all";
  const kindFilter =
    kindParam === "campaign" ? "CAMPAIGN" : kindParam === "mitteilungen" ? "MITTEILUNGEN" : "ALL";

  const { tenant: tenantPermissions } = await getRequestEffectivePermissions(
    session.user.id,
    tenant.id,
  );
  const authz = await resolvePlatformTemplateAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });
  const canView = tenantPermissionsIncludePlatformTemplateView(tenantPermissions) || authz.canView;

  if (!canView) notFound();

  const rows = await listVorlagenForManagement({
    tenantId: tenant.id,
    search: params.q,
    kindFilter,
  });

  const hasActiveFilters = Boolean(params.q?.trim() || kindParam !== "all");

  const primaryAction = authz.canManage ? (
    <Link
      href="/dashboard/communication/vorlagen/new"
      className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
    >
      Neue Vorlage
    </Link>
  ) : undefined;

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Vorlagen" },
        ]}
        title="Vorlagen"
        description={VORLAGEN_OVERVIEW_DESCRIPTION}
        primaryAction={rows.length > 0 ? primaryAction : undefined}
      />

      <CommunicationContentSurface padded={rows.length === 0 && !hasActiveFilters}>
        <Suspense fallback={null}>
          <VorlagenListToolbar canManage={authz.canManage} showCreateAction={rows.length === 0} />
        </Suspense>

        {rows.length === 0 ? (
          hasActiveFilters ? (
            <div className="py-8 text-center text-sm">
              <p className="font-medium text-[var(--foreground)]">Keine Vorlagen gefunden</p>
              <p className="mt-2 text-[var(--text-2)]">
                Passen Sie Suche oder Filter an oder{" "}
                <Link
                  href="/dashboard/communication/vorlagen"
                  className="text-[var(--sce-primary)] hover:underline"
                >
                  Filter zurücksetzen
                </Link>
                .
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<FileStack className="h-8 w-8" aria-hidden />}
              heading="Noch keine Vorlagen"
              description="Legen Sie wiederverwendbare Inhalte für Mitteilungen und Kampagnen an."
              action={primaryAction}
            />
          )
        ) : (
          <>
            <div className="mb-4 md:hidden">{primaryAction}</div>
            <div className="hidden overflow-hidden rounded-lg border border-[var(--border)] md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3" scope="col">
                      Name
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Geeignet für
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Inhalt
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Status
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Verwendung
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Geändert
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/communication/vorlagen/${row.id}`}
                          className="font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]"
                        >
                          {row.name}
                        </Link>
                        {row.creatorDisplayName ? (
                          <p className="mt-0.5 text-xs text-[var(--muted)]">von {row.creatorDisplayName}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">
                        {row.applicabilityLabel}
                        <span className="sr-only"> ({vorlageKindLabel(row.kind)})</span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-[var(--text-2)]">
                        {row.contentPreview}
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusPill
                          label={vorlageStatusLabel(row.status)}
                          tone={vorlageStatusTone(row.status)}
                        />
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">
                        {row.usageCount > 0 ? `${row.usageCount}×` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-2)]">
                        {formatVorlagenListTimestamp(row.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden" aria-label="Vorlagen">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4"
                >
                  <Link
                    href={`/dashboard/communication/vorlagen/${row.id}`}
                    className="text-base font-semibold text-[var(--foreground)]"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--text-2)]">{row.applicabilityLabel}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-2)]">{row.contentPreview}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AdminStatusPill
                      label={vorlageStatusLabel(row.status)}
                      tone={vorlageStatusTone(row.status)}
                    />
                    {row.usageCount > 0 ? (
                      <span className="text-xs text-[var(--muted)]">{row.usageCount}× verwendet</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Geändert {formatVorlagenListTimestamp(row.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </CommunicationContentSurface>
    </PageShell>
  );
}
