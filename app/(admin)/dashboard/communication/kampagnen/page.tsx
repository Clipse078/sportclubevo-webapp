import Link from "next/link";
import { Suspense } from "react";
import { Megaphone } from "lucide-react";
import { notFound } from "next/navigation";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { KampagnenListToolbar } from "@/components/admin/communication/kampagnen/KampagnenListToolbar";
import { EmptyState, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { resolveCampaignAuthorization } from "@/lib/communication/campaign/campaign-authorization";
import { listCampaigns } from "@/lib/communication/campaign/campaign-service";
import {
  formatKampagnenCreator,
  formatKampagnenListTimestamp,
  kampagnenListTimeColumnLabel,
  kampagnenListTitle,
  resolveKampagnenDisplayStatus,
} from "@/lib/communication/campaign/kampagnen-display";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ q?: string; status?: string; mine?: string }> };

export default async function CampaignListPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission(CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const authz = await resolveCampaignAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const params = (await searchParams) ?? {};
  const statusParam = params.status?.trim() ?? "";
  const scheduledOnly = statusParam === "scheduled";
  const statusFilter =
    statusParam && statusParam !== "scheduled" ? statusParam : undefined;

  const items = await listCampaigns({
    tenantId: tenant.id,
    viewerUserId: session.user.id,
    viewerCanSend: authz.canSend,
    search: params.q,
    status: statusFilter,
    scheduledOnly,
    createdByUserId: params.mine === "1" && authz.canSend ? session.user.id : undefined,
  });

  const hasActiveFilters = Boolean(
    params.q?.trim() || statusParam || params.mine === "1",
  );

  const primaryAction = authz.canSend ? (
    <Link
      href="/dashboard/communication/kampagnen/new"
      className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
    >
      Neue Kampagne
    </Link>
  ) : undefined;

  const timeColumnLabel =
    items.some(
      (item) => item.scheduleStatus === "SCHEDULED" || item.scheduleStatus === "PROCESSING",
    )
      ? "Zeitpunkt"
      : items.some((item) => item.status === "PUBLISHED")
        ? "Veröffentlicht"
        : "Aktualisiert";

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kampagnen" },
        ]}
        title="Kampagnen"
        description="Geplante organisationsweite Kommunikation an definierte Zielgruppen — mit Kanälen, Terminplanung und Auswertung nach Veröffentlichung."
        primaryAction={items.length > 0 ? primaryAction : undefined}
      />

      <CommunicationContentSurface padded={items.length === 0 && !hasActiveFilters}>
        {items.length === 0 ? (
          hasActiveFilters ? (
            <div className="py-8 text-center text-sm">
              <p className="font-medium text-[var(--foreground)]">Keine Kampagnen gefunden</p>
              <p className="mt-2 text-[var(--text-2)]">
                Passen Sie Suche oder Filter an oder{" "}
                <Link href="/dashboard/communication/kampagnen" className="text-[var(--sce-primary)] hover:underline">
                  Filter zurücksetzen
                </Link>
                .
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<Megaphone className="h-8 w-8" aria-hidden />}
              heading="Noch keine Kampagnen"
              description="Kampagnen erreichen breitere Zielgruppen über mehrere Kanäle — geplant oder sofort veröffentlicht."
              action={primaryAction}
            />
          )
        ) : (
          <>
            <Suspense fallback={null}>
              <KampagnenListToolbar canSend={authz.canSend} />
            </Suspense>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--text-2)]">
                  <tr>
                    <th className="px-4 py-3">Titel / Betreff</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Zielgruppe</th>
                    <th className="hidden px-4 py-3 md:table-cell">Kanäle</th>
                    <th className="hidden px-4 py-3 lg:table-cell">{timeColumnLabel}</th>
                    <th className="hidden px-4 py-3 xl:table-cell">Erstellt von</th>
                    <th className="hidden px-4 py-3 xl:table-cell">Ergebnis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {items.map((item) => {
                    const displayStatus = resolveKampagnenDisplayStatus({
                      status: item.status,
                      scheduleStatus: item.scheduleStatus,
                    });
                    const title = kampagnenListTitle(item);
                    return (
                      <tr key={item.id} className="hover:bg-[var(--surface-2)]/40">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/communication/kampagnen/${item.id}`}
                            className="font-medium text-[var(--sce-primary)] hover:underline"
                          >
                            {title}
                          </Link>
                          {item.internalName !== title ? (
                            <p className="mt-0.5 text-xs text-[var(--text-2)]">{item.internalName}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <AdminStatusPill label={displayStatus.label} tone={displayStatus.tone} />
                          {displayStatus.srHint ? (
                            <span className="sr-only">{displayStatus.srHint}</span>
                          ) : null}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--text-2)] lg:table-cell">
                          {item.audienceSummary}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--text-2)] md:table-cell">
                          {item.channelSummary}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--text-2)] lg:table-cell">
                          <span className="sr-only">
                            {kampagnenListTimeColumnLabel({
                              status: item.status,
                              scheduleStatus: item.scheduleStatus,
                            })}
                          </span>
                          {formatKampagnenListTimestamp(item)}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--text-2)] xl:table-cell">
                          {formatKampagnenCreator(item.authorPerson)}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--text-2)] xl:table-cell">
                          {item.deliverySnapshotCount != null
                            ? `${item.deliverySnapshotCount} Zustellungen`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-[var(--border)] md:hidden">
              {items.map((item) => {
                const displayStatus = resolveKampagnenDisplayStatus({
                  status: item.status,
                  scheduleStatus: item.scheduleStatus,
                });
                const title = kampagnenListTitle(item);
                return (
                  <li key={item.id} className="py-3">
                    <Link
                      href={`/dashboard/communication/kampagnen/${item.id}`}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-medium text-[var(--sce-primary)]">{title}</span>
                          <p className="mt-1 text-xs text-[var(--text-2)]">
                            {item.audienceSummary} · {item.channelSummary}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-2)]">
                            {formatKampagnenCreator(item.authorPerson)} ·{" "}
                            {formatKampagnenListTimestamp(item)}
                          </p>
                        </div>
                        <AdminStatusPill label={displayStatus.label} tone={displayStatus.tone} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CommunicationContentSurface>
    </PageShell>
  );
}
