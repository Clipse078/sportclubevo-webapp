import Link from "next/link";
import { Send } from "lucide-react";
import { notFound } from "next/navigation";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { EmptyState, PageShell, SectionCard } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { resolveCampaignAuthorization } from "@/lib/communication/campaign/campaign-authorization";
import { listCampaigns } from "@/lib/communication/campaign/campaign-service";
import { listUpcomingPublicationSchedules } from "@/lib/communication/scheduling/publication-schedule-service";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  READY: "Bereit",
  PUBLISHED: "Veröffentlicht",
  ARCHIVED: "Archiviert",
};

type PageProps = { searchParams?: Promise<{ q?: string; status?: string }> };

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
  const schedules = await listUpcomingPublicationSchedules({ tenantId: tenant.id });

  const items = await listCampaigns({
    tenantId: tenant.id,
    viewerUserId: session.user.id,
    viewerCanSend: authz.canSend,
    search: params.q,
    status: params.status,
  });

  const primaryAction = authz.canSend ? (
    <Link
      href="/dashboard/communication/kampagnen/new"
      className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
    >
      Neue Kampagne
    </Link>
  ) : undefined;

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kampagnen" },
        ]}
        title="Kampagnen"
        description="Organisationsweite Kampagnen — Zielgruppen werden bei Veröffentlichung aufgelöst; Empfänger bleiben historisch unveränderlich."
        primaryAction={items.length > 0 ? primaryAction : undefined}
      />

      {schedules.length > 0 ? (
        <SectionCard title="Geplante Veröffentlichungen" className="mb-6">
          <ul className="space-y-2 text-sm">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <span>
                  {s.kind} · {s.internalName ?? s.subject ?? s.communicationId} ·{" "}
                  {new Date(s.scheduledAt).toLocaleString("de-CH", {
                    timeZone: resolveTenantEventTimezone(tenant.timezone),
                  })}{" "}
                  ({resolveTenantEventTimezone(tenant.timezone)})
                </span>
                <span className="text-xs text-[var(--text-2)]">{s.status}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <CommunicationContentSurface padded={items.length === 0}>
        {items.length === 0 ? (
          <EmptyState
            icon={<Send className="h-8 w-8" aria-hidden />}
            heading="Noch keine Kampagnen"
            description="Planen und veröffentlichen Sie Ihre erste organisationsweite Kampagne."
            action={primaryAction}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[var(--text-2)]">
                <tr>
                  <th className="px-2 py-3 md:px-4">Status</th>
                  <th className="px-2 py-3 md:px-4">Interner Name</th>
                  <th className="hidden px-4 py-3 md:table-cell">Zielgruppe</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Autor</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Aktualisiert</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Veröffentlicht</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Empfänger</th>
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
                    <td className="px-2 py-3 md:px-4">
                      <Link
                        href={`/dashboard/communication/kampagnen/${item.id}`}
                        className="font-medium text-[var(--sce-primary)] hover:underline"
                      >
                        {item.internalName}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-2)] md:table-cell">
                      {item.audienceSummary}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-2)] lg:table-cell">
                      {item.authorPerson
                        ? `${item.authorPerson.firstName} ${item.authorPerson.lastName}`.trim()
                        : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-2)] lg:table-cell">
                      {new Date(item.updatedAt).toLocaleString("de-CH")}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-2)] xl:table-cell">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleString("de-CH") : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-2)] xl:table-cell">
                      {item.recipientCount ?? "—"}
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
