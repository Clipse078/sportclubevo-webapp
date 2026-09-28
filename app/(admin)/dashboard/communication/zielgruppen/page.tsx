import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Target } from "lucide-react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import ZielgruppenListToolbar from "@/components/admin/communication/zielgruppen/ZielgruppenListToolbar";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { EmptyState, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import {
  formatZielgruppenListTimestamp,
  ZIELGRUPPEN_OVERVIEW_DESCRIPTION,
} from "@/lib/communication/zielgruppen/zielgruppen-display";
import {
  tenantPermissionsIncludeZielgruppenManage,
  ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS,
} from "@/lib/communication/zielgruppen/route-access";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
  ARCHIVED: "Archiviert",
};

function getStatusTone(status: string): "success" | "muted" | "default" {
  if (status === "ACTIVE") return "success";
  return "muted";
}

type PageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>;
};

export default async function CommunicationZielgruppenPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission(ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const params = (await searchParams) ?? {};
  const statusParam = params.status ?? "active";
  const statusFilter =
    statusParam === "archived" ? "ARCHIVED" : statusParam === "all" ? "ALL" : "ACTIVE";

  const { tenant: tenantPermissions } = await getRequestEffectivePermissions(
    session.user.id,
    tenant.id,
  );
  const canManage = tenantPermissionsIncludeZielgruppenManage(tenantPermissions);

  const rows = await listZielgruppenForManagement({
    tenantId: tenant.id,
    search: params.q,
    statusFilter,
  });

  const hasActiveFilters = Boolean(params.q?.trim() || statusParam !== "active");

  const primaryAction = canManage ? (
    <Link
      href="/dashboard/communication/zielgruppen/new"
      className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
    >
      Neue Zielgruppe
    </Link>
  ) : undefined;

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Zielgruppen" },
        ]}
        title="Zielgruppen"
        description={ZIELGRUPPEN_OVERVIEW_DESCRIPTION}
        primaryAction={rows.length > 0 ? primaryAction : undefined}
      />

      <CommunicationContentSurface padded={rows.length === 0 && !hasActiveFilters}>
        <Suspense fallback={null}>
          <ZielgruppenListToolbar canManage={canManage} showCreateAction={rows.length === 0} />
        </Suspense>

        {rows.length === 0 ? (
          hasActiveFilters ? (
            <div className="py-8 text-center text-sm">
              <p className="font-medium text-[var(--foreground)]">Keine Zielgruppen gefunden</p>
              <p className="mt-2 text-[var(--text-2)]">
                Passen Sie Suche oder Filter an oder{" "}
                <Link
                  href="/dashboard/communication/zielgruppen"
                  className="text-[var(--sce-primary)] hover:underline"
                >
                  Filter zurücksetzen
                </Link>
                .
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<ProductDomainSceIcon name="people" size={48} />}
              heading="Noch keine Zielgruppen"
              description="Definieren Sie Empfängerregeln einmal und nutzen Sie die Gruppe in Mitteilungen und Kampagnen wieder."
              action={primaryAction}
            />
          )
        ) : (
          <>
            <div className="mb-4 md:hidden">
              {primaryAction}
            </div>
            <div className="hidden overflow-hidden rounded-lg border border-[var(--border)] md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3" scope="col">
                      Name
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Regeltyp
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Zusammenfassung
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Status
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Geändert
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((tg) => (
                    <tr key={tg.id} className="hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/communication/zielgruppen/${tg.id}`}
                          className="font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]"
                        >
                          {tg.name}
                        </Link>
                        {tg.description ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)]">
                            {tg.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">{tg.ruleCharacterLabel}</td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)]">
                        {tg.summaryHeadline}
                        {tg.summaryParts.length > 0 ? (
                          <span className="block">{tg.summaryParts.join(" · ")}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusPill
                          label={STATUS_LABELS[tg.status] ?? tg.status}
                          tone={getStatusTone(tg.status)}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)]">
                        {formatZielgruppenListTimestamp(tg.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] md:hidden">
              {rows.map((tg) => (
                <Link
                  key={tg.id}
                  href={`/dashboard/communication/zielgruppen/${tg.id}`}
                  className="group flex flex-col gap-2 px-4 py-4 transition hover:bg-[var(--surface-2)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)]">
                      <Target className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{tg.name}</p>
                        <AdminStatusPill
                          label={STATUS_LABELS[tg.status] ?? tg.status}
                          tone={getStatusTone(tg.status)}
                        />
                      </div>
                      <p className="text-xs text-[var(--muted)]">{tg.ruleCharacterLabel}</p>
                      {tg.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--text-2)]">
                          {tg.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-[var(--muted)]">{tg.summaryHeadline}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    Geändert {formatZielgruppenListTimestamp(tg.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </CommunicationContentSurface>
    </PageShell>
  );
}
