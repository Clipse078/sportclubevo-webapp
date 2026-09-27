import Link from "next/link";
import { notFound } from "next/navigation";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveCampaignAuthorization } from "@/lib/communication/campaign/campaign-authorization";
import { listCampaigns } from "@/lib/communication/campaign/campaign-service";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  READY: "Bereit",
  PUBLISHED: "Veröffentlicht",
  ARCHIVED: "Archiviert",
};

type PageProps = { searchParams?: Promise<{ q?: string; status?: string }> };

export default async function CampaignListPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission([
    PERMISSIONS.COMMUNICATION_CLUB_VIEW,
    PERMISSIONS.COMMUNICATION_CLUB_SEND,
  ]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const authz = await resolveCampaignAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const params = (await searchParams) ?? {};
  const items = await listCampaigns({
    tenantId: tenant.id,
    viewerUserId: session.user.id,
    viewerCanSend: authz.canSend,
    search: params.q,
    status: params.status,
  });

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kampagnen" },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikation"
        title="Kampagnen"
        description="Organisationsweite Kampagnen — Zielgruppen werden bei Veröffentlichung aufgelöst; Empfänger bleiben historisch unveränderlich."
      />
      {authz.canSend ? (
        <div className="mb-4 flex justify-end">
          <Link
            href="/dashboard/communication/kampagnen/new"
            className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Neue Kampagne
          </Link>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-2)]">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Interner Name</th>
              <th className="px-4 py-3">Zielgruppe</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Aktualisiert</th>
              <th className="px-4 py-3">Veröffentlicht</th>
              <th className="px-4 py-3">Empfänger</th>
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
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/communication/kampagnen/${item.id}`}
                    className="font-medium text-[var(--sce-primary)] hover:underline"
                  >
                    {item.internalName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">{item.audienceSummary}</td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {item.authorPerson
                    ? `${item.authorPerson.firstName} ${item.authorPerson.lastName}`.trim()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {new Date(item.updatedAt).toLocaleString("de-CH")}
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {item.publishedAt ? new Date(item.publishedAt).toLocaleString("de-CH") : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {item.recipientCount ?? "—"}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-2)]">
                  Noch keine Kampagnen vorhanden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
