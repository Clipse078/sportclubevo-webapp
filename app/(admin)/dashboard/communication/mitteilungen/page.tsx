import Link from "next/link";
import { Mail } from "lucide-react";
import { notFound } from "next/navigation";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { EmptyState, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import { listClubCommunications } from "@/lib/communication/club/club-communication-service";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  PUBLISHED: "Veröffentlicht",
  ARCHIVED: "Archiviert",
};

const KIND_LABEL: Record<string, string> = {
  MESSAGE: "Nachricht",
  ANNOUNCEMENT: "Mitteilung",
  ALERT: "Alarm",
};

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

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Mitteilungen" },
        ]}
        title="Mitteilungen"
        description="Organisationsweite Nachrichten, Mitteilungen und Alarme — Zielgruppen werden bei Veröffentlichung aufgelöst."
        primaryAction={items.length > 0 ? primaryAction : undefined}
      />

      <CommunicationContentSurface padded={items.length === 0}>
        {items.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-8 w-8" aria-hidden />}
            heading="Noch keine Mitteilungen"
            description="Erstellen Sie die erste organisationsweite Mitteilung für Ihren Verein."
            action={primaryAction}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[var(--text-2)]">
                <tr>
                  <th className="px-2 py-3 md:px-4">Status</th>
                  <th className="px-2 py-3 md:px-4">Typ</th>
                  <th className="px-2 py-3 md:px-4">Betreff / Inhalt</th>
                  <th className="hidden px-4 py-3 md:table-cell">Zielgruppe</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Absender</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Veröffentlicht</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--surface-2)]/40">
                    <td className="px-2 py-3 md:px-4">
                      <AdminStatusPill
                        label={STATUS_LABEL[item.status] ?? item.status}
                        tone={item.status === "PUBLISHED" ? "success" : "muted"}
                      />
                    </td>
                    <td className="px-2 py-3 md:px-4">{KIND_LABEL[item.kind] ?? item.kind}</td>
                    <td className="px-2 py-3 md:px-4">
                      <Link
                        href={`/dashboard/communication/mitteilungen/${item.id}`}
                        className="font-medium text-[var(--sce-primary)] hover:underline"
                      >
                        {item.subject?.trim() || item.bodyText.slice(0, 80)}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-2)] md:table-cell">
                      {item.audienceSummary}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-2)] lg:table-cell">
                      {item.senderPerson
                        ? `${item.senderPerson.firstName} ${item.senderPerson.lastName}`.trim()
                        : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-2)] lg:table-cell">
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleString("de-CH")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CommunicationContentSurface>
    </PageShell>
  );
}
