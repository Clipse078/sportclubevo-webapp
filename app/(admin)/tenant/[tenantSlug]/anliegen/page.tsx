import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContextForSlug } from "@/lib/tenants/active-tenant";
import { listClubMeldungen } from "@/lib/club-meldungen/queries";
import { CLUB_MELDUNG_WORKSPACE_COPY } from "@/lib/club-meldungen/copy";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

type Props = { params: Promise<{ tenantSlug: string }> };

export default async function TenantAnliegenHomePage({ params }: Props) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantContextForSlug(tenantSlug);
  const session = await requireAnyPermission([PERMISSIONS.MELDUNGEN_SUBMIT], tenant.id);
  const actorUserId = session.user.effectiveUserId ?? session.user.id;

  const items = await listClubMeldungen({
    tenantId: tenant.id,
    view: "reporter",
    actorUserId,
    canViewAll: false,
  });

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsbetrieb"
        title={CLUB_MELDUNG_WORKSPACE_COPY.reporterListTitle}
        description="Eigene Meldungen einsehen und Rückmeldungen des Vereins verfolgen."
        breadcrumbs={[
          { label: "Anliegen", href: `/tenant/${tenantSlug}/anliegen` },
          { label: CLUB_MELDUNG_WORKSPACE_COPY.reporterListTitle },
        ]}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <Link
            href={`/tenant/${tenantSlug}/anliegen/melden`}
            className="sce-button-primary inline-flex w-fit rounded-md px-4 py-2 text-sm font-medium"
          >
            Anliegen melden
          </Link>
          {items.length === 0 ? (
            <p className="sce-type-body text-slate-600">Noch keine eigenen Meldungen.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/tenant/${tenantSlug}/anliegen/${item.id}`}
                    className="block px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="font-mono text-xs text-slate-500">{item.caseNumber}</span>
                    <p className="sce-type-section-title font-medium text-slate-900">{item.subject}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ListPagePattern>
    </PageShell>
  );
}