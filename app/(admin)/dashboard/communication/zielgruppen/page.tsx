import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Target } from "lucide-react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import ZielgruppenListToolbar from "@/components/admin/communication/zielgruppen/ZielgruppenListToolbar";
import { EmptyState } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
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

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Kommunikation"
        title="Zielgruppen"
        description="Organisationsweite, wiederverwendbare Empfängerdefinitionen für Kommunikation — getrennt von Versandberechtigungen."
      />

      <Suspense fallback={null}>
        <ZielgruppenListToolbar canManage={canManage} />
      </Suspense>

      {rows.length === 0 ? (
        <div className="sce-detail-section">
          <EmptyState
            icon={<ProductDomainSceIcon name="people" size={48} />}
            heading="Noch keine Zielgruppen"
            description="Definiere strukturelle Kriterien, Rollen und explizite Personen — ohne technische Regeln."
            action={
              canManage ? (
                <Link
                  href="/dashboard/communication/zielgruppen/new"
                  className="fca-button-primary"
                >
                  Erste Zielgruppe erstellen
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="sce-detail-section overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {rows.map((tg) => (
              <Link
                key={tg.id}
                href={`/dashboard/communication/zielgruppen/${tg.id}`}
                className="group flex flex-col gap-2 px-5 py-4 transition hover:bg-[var(--surface-2)] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)]">
                  <Target className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{tg.name}</p>
                    <AdminStatusPill
                      label={STATUS_LABELS[tg.status] ?? tg.status}
                      tone={getStatusTone(tg.status)}
                    />
                  </div>
                  {tg.description ? (
                    <p className="text-xs text-[var(--muted)] line-clamp-2">{tg.description}</p>
                  ) : null}
                  <p className="text-xs text-[var(--text-2)]">{tg.summaryHeadline}</p>
                  {tg.summaryParts.length > 0 ? (
                    <p className="text-[11px] text-[var(--muted)]">{tg.summaryParts.join(" · ")}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-start gap-1 text-[11px] text-[var(--muted)] sm:items-end">
                  <span>
                    {new Date(tg.updatedAt).toLocaleDateString("de-CH", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="transition group-hover:text-[var(--blue)]">Öffnen →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
