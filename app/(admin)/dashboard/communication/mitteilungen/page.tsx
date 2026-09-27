import Link from "next/link";
import { notFound } from "next/navigation";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
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
  const session = await requireAnyPermission([
    PERMISSIONS.COMMUNICATION_CLUB_VIEW,
    PERMISSIONS.COMMUNICATION_CLUB_SEND,
  ]);
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

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Mitteilungen" },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikation"
        title="Mitteilungen"
        description="Organisationsweite Nachrichten, Mitteilungen und Alarme — Zielgruppen werden bei Veröffentlichung aufgelöst."
      />
      {authz.canSend ? (
        <div className="mb-4 flex justify-end">
          <Link
            href="/dashboard/communication/mitteilungen/new"
            className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Neue Mitteilung
          </Link>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-2)]">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Betreff / Inhalt</th>
              <th className="px-4 py-3">Zielgruppe</th>
              <th className="px-4 py-3">Absender</th>
              <th className="px-4 py-3">Veröffentlicht</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-1)]">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="px-4 py-3">
                  <AdminStatusPill
                    label={STATUS_LABEL[item.status] ?? item.status}
                    tone={item.status === "PUBLISHED" ? "success" : "muted"}
                  />
                </td>
                <td className="px-4 py-3">{KIND_LABEL[item.kind] ?? item.kind}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/communication/mitteilungen/${item.id}`}
                    className="font-medium text-[var(--sce-primary)] hover:underline"
                  >
                    {item.subject?.trim() || item.bodyText.slice(0, 80)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">{item.audienceSummary}</td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {item.senderPerson
                    ? `${item.senderPerson.firstName} ${item.senderPerson.lastName}`.trim()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleString("de-CH")
                    : "—"}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-2)]">
                  Noch keine Vereinsmitteilungen vorhanden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
