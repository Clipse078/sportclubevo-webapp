import Link from "next/link";
import { Suspense } from "react";
import { Mail } from "lucide-react";
import { notFound } from "next/navigation";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { MitteilungenListToolbar } from "@/components/admin/communication/mitteilungen/MitteilungenListToolbar";
import { EmptyState, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import { listClubCommunications } from "@/lib/communication/club/club-communication-service";
import {
  formatMitteilungCreator,
  formatMitteilungListTimestamp,
  mitteilungKindLabel,
  mitteilungListTimeColumnLabel,
  resolveMitteilungDisplayStatus,
} from "@/lib/communication/club/mitteilungen-display";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ q?: string; status?: string; kind?: string }> };

export default async function ClubMitteilungenPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission(CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const authz = await resolveClubCommunicationAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const params = (await searchParams) ?? {};
  const items = await listClubCommunications({
    tenantId: tenant.id,
    viewerUserId: session.user.id,
    viewerCanSend: authz.canSend,
    search: params.q,
    status: params.status,
    kind: params.kind,
  });

  const primaryAction = authz.canSend ? (
    <Link
      href="/dashboard/communication/mitteilungen/new"
      className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
    >
      Neue Mitteilung
    </Link>
  ) : undefined;

  const timeColumnLabel =
    items.some(
      (item) => item.scheduleStatus === "SCHEDULED" || item.scheduleStatus === "PROCESSING",
    )
      ? "Zeitpunkt"
      : items.some((item) => item.status === "PUBLISHED")
        ? "Gesendet"
        : "Erstellt";

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Mitteilungen" },
        ]}
        title="Mitteilungen"
        description="Operative Vereinsinformationen an definierte Zielgruppen — von der Vorbereitung bis zur Zustellung."
        primaryAction={items.length > 0 ? primaryAction : undefined}
      />

      <CommunicationContentSurface padded={items.length === 0}>
        {items.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-8 w-8" aria-hidden />}
            heading="Noch keine Mitteilungen"
            description="Mitteilungen informieren Ihren Verein gezielt — z. B. zu Training, Terminen oder organisatorischen Themen."
            action={primaryAction}
          />
        ) : (
          <>
            <Suspense fallback={null}>
              <MitteilungenListToolbar canSend={authz.canSend} />
            </Suspense>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--text-2)]">
                  <tr>
                    <th className="px-4 py-3">Titel</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Zielgruppe</th>
                    <th className="hidden px-4 py-3 xl:table-cell">Erstellt von</th>
                    <th className="hidden px-4 py-3 lg:table-cell">{timeColumnLabel}</th>
                    <th className="hidden px-4 py-3 xl:table-cell">Zustellung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {items.map((item) => {
                    const displayStatus = resolveMitteilungDisplayStatus({
                      status: item.status,
                      scheduleStatus: item.scheduleStatus,
                    });
                    const kindLabel = mitteilungKindLabel(item.kind);
                    return (
                      <tr key={item.id} className="hover:bg-[var(--surface-2)]/40">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/communication/mitteilungen/${item.id}`}
                            className="font-medium text-[var(--sce-primary)] hover:underline"
                          >
                            {item.subject?.trim() || item.bodyText.slice(0, 80)}
                          </Link>
                          {kindLabel ? (
                            <p className="mt-0.5 text-xs text-[var(--text-2)]">{kindLabel}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <AdminStatusPill
                            label={displayStatus.label}
                            tone={displayStatus.tone}
                          />
                          {displayStatus.srHint ? (
                            <span className="sr-only">{displayStatus.srHint}</span>
                          ) : null}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--text-2)] lg:table-cell">
                          {item.audienceSummary}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--text-2)] xl:table-cell">
                          {formatMitteilungCreator(item.senderPerson)}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--text-2)] lg:table-cell">
                          <span className="sr-only">
                            {mitteilungListTimeColumnLabel({
                              status: item.status,
                              scheduleStatus: item.scheduleStatus,
                            })}
                          </span>
                          {formatMitteilungListTimestamp(item)}
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
                const displayStatus = resolveMitteilungDisplayStatus({
                  status: item.status,
                  scheduleStatus: item.scheduleStatus,
                });
                return (
                  <li key={item.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/dashboard/communication/mitteilungen/${item.id}`}
                          className="font-medium text-[var(--sce-primary)]"
                        >
                          {item.subject?.trim() || item.bodyText.slice(0, 80)}
                        </Link>
                        <p className="mt-1 text-xs text-[var(--text-2)]">{item.audienceSummary}</p>
                        <p className="mt-1 text-xs text-[var(--text-2)]">
                          {formatMitteilungCreator(item.senderPerson)} ·{" "}
                          {formatMitteilungListTimestamp(item)}
                        </p>
                      </div>
                      <AdminStatusPill label={displayStatus.label} tone={displayStatus.tone} />
                    </div>
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
